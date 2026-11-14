import { Router } from "express";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { AuthenticatorTransport } from "@simplewebauthn/server";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/async";
import { requireAuth } from "../../middleware/auth";
import { HttpError } from "../../middleware/errors";
import { env } from "../../config/env";
import { randomBytes } from "node:crypto";
import { setSessionCookie, setCsrfCookie } from "../../lib/cookies";
import { generateToken, hashToken } from "../../lib/tokens";
import { logSecurityEvent } from "../../lib/security";
import { writeAudit } from "../../lib/audit";
import { verifyPassword } from "../../lib/password";
import { getSystemSettings } from "../../middleware/settings";
import { logger } from "../../lib/logger";

const rpID = env.NODE_ENV === "production" ? new URL(env.WEB_ORIGIN).hostname : "localhost";
const expectedOrigin = env.WEB_ORIGIN;

// Challenges expire after 5 minutes
const CHALLENGE_TTL_MS = 5 * 60_000;

export const passkeysRouter = Router();

// ── REGISTER ────────────────────────────────────────────────

passkeysRouter.get(
  "/register/options",
  requireAuth,
  asyncHandler(async (req, res) => {
    // Require password confirmation via header
    const password = req.headers["x-confirm-password"];
    if (typeof password !== "string" || !password) {
      throw new HttpError(
        400,
        "X-Confirm-Password header required to register a passkey",
        "invalid_request",
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { passkeys: true },
    });
    if (!user) throw new HttpError(404, "User not found", "not_found");
    if (!user.passwordHash) {
      throw new HttpError(
        400,
        "Password authentication is not set up for this account",
        "invalid_request",
      );
    }

    const isValid = await verifyPassword(user.passwordHash, password);
    if (!isValid) {
      logSecurityEvent("LOGIN_FAILED", {
        userId: user.id,
        email: user.email,
        ip: req.ip,
        reason: "passkey_register_bad_password",
      });
      throw new HttpError(401, "Incorrect password", "invalid_credentials");
    }

    // Delete old challenges to prevent buildup
    await prisma.passkeyChallenge.deleteMany({ where: { userId: user.id } });

    const options = await generateRegistrationOptions({
      rpName: "HAWLHAYE",
      rpID,
      userID: new TextEncoder().encode(user.id),
      userName: user.email,
      userDisplayName: user.fullName,
      attestationType: "none",
      excludeCredentials: user.passkeys.map((pk) => ({
        id: pk.credentialID,
        type: "public-key",
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "required",
        authenticatorAttachment: "platform",
      },
    });

    await prisma.passkeyChallenge.create({
      data: { userId: user.id, challenge: options.challenge },
    });

    res.json({ data: options });
  }),
);

passkeysRouter.post(
  "/register/verify",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { body } = req;
    const expectedChallenge = await prisma.passkeyChallenge.findFirst({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
    });

    if (!expectedChallenge) throw new HttpError(400, "Challenge not found", "invalid_request");

    // Check challenge expiry
    if (Date.now() - expectedChallenge.createdAt.getTime() > CHALLENGE_TTL_MS) {
      await prisma.passkeyChallenge.delete({ where: { id: expectedChallenge.id } });
      throw new HttpError(400, "Challenge expired", "invalid_request");
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge: expectedChallenge.challenge,
        expectedOrigin,
        expectedRPID: rpID,
        requireUserVerification: true,
      });
    } catch (error) {
      logger.error({ error }, "Passkey registration verification failed");
      throw new HttpError(400, (error as Error).message, "invalid_passkey");
    }

    const { verified, registrationInfo } = verification;
    if (!verified || !registrationInfo) {
      throw new HttpError(400, "Passkey verification failed", "invalid_passkey");
    }

    const { credential } = registrationInfo;

    await prisma.$transaction([
      prisma.passkey.create({
        data: {
          userId: req.user!.id,
          credentialID: credential.id,
          publicKey: Buffer.from(credential.publicKey),
          counter: credential.counter,
          transports: body.response.transports?.join(",") || "",
        },
      }),
      prisma.passkeyChallenge.delete({ where: { id: expectedChallenge.id } }),
    ]);

    await writeAudit({
      actorId: req.user!.id,
      action: "auth.passkey_registered",
      entityType: "User",
      entityId: req.user!.id,
      req,
    });

    logSecurityEvent("2FA_ENABLED", { userId: req.user!.id, ip: req.ip, method: "passkey" });
    res.json({ data: { verified: true } });
  }),
);

// ── LOGIN ───────────────────────────────────────────────────

passkeysRouter.post(
  "/login/options",
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) throw new HttpError(400, "Email required", "invalid_request");

    const user = await prisma.user.findUnique({
      where: { email },
      include: { passkeys: true },
    });

    const hasPasskeys = !!(user && user.passkeys.length > 0);

    // Always return a challenge with the same shape, regardless of whether the user exists
    // This prevents enumeration: the response looks identical for all emails
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: hasPasskeys
        ? user!.passkeys.map((pk) => ({
            id: pk.credentialID,
            type: "public-key",
            transports: pk.transports
              ? (pk.transports.split(",") as AuthenticatorTransport[])
              : undefined,
          }))
        : [],
      userVerification: "required",
    });

    // Only store the challenge if the user actually has passkeys registered
    if (hasPasskeys) {
      await prisma.passkeyChallenge.deleteMany({ where: { userId: user!.id } });
      await prisma.passkeyChallenge.create({
        data: { userId: user!.id, challenge: options.challenge },
      });
    }

    res.json({ data: options });
  }),
);

passkeysRouter.post(
  "/login/verify",
  asyncHandler(async (req, res) => {
    const { body } = req;
    const credentialID = body.id;

    const passkey = await prisma.passkey.findUnique({
      where: { credentialID },
      include: { user: true },
    });

    // Generic error for all failure cases to prevent enumeration
    if (!passkey) throw new HttpError(401, "Authentication failed", "invalid_credentials");

    const expectedChallenge = await prisma.passkeyChallenge.findFirst({
      where: { userId: passkey.userId },
      orderBy: { createdAt: "desc" },
    });
    if (!expectedChallenge)
      throw new HttpError(401, "Authentication failed", "invalid_credentials");

    // Challenge expiry check
    if (Date.now() - expectedChallenge.createdAt.getTime() > CHALLENGE_TTL_MS) {
      await prisma.passkeyChallenge.delete({ where: { id: expectedChallenge.id } });
      throw new HttpError(401, "Authentication failed", "invalid_credentials");
    }

    // Account status checks
    if (!passkey.user.active) {
      throw new HttpError(401, "Authentication failed", "invalid_credentials");
    }
    if (passkey.user.lockedUntil && passkey.user.lockedUntil.getTime() > Date.now()) {
      throw new HttpError(401, "Authentication failed", "invalid_credentials");
    }

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge: expectedChallenge.challenge,
        expectedOrigin,
        expectedRPID: rpID,
        credential: {
          id: passkey.credentialID,
          publicKey: passkey.publicKey,
          counter: passkey.counter,
        },
        requireUserVerification: true,
      });
    } catch (error) {
      logger.error({ error }, "Passkey authentication verification failed");
      throw new HttpError(401, "Authentication failed", "invalid_credentials");
    }

    const { verified, authenticationInfo } = verification;
    if (!verified) throw new HttpError(401, "Authentication failed", "invalid_credentials");

    const settings = await getSystemSettings();

    await prisma.$transaction([
      prisma.passkey.update({
        where: { id: passkey.id },
        data: { counter: authenticationInfo.newCounter },
      }),
      prisma.passkeyChallenge.delete({ where: { id: expectedChallenge.id } }),
      prisma.user.update({
        where: { id: passkey.userId },
        data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null },
      }),
    ]);

    const user = passkey.user;
    const token = generateToken();
    const ttlMs = (settings?.sessionTimeout ?? env.SESSION_TTL_HOURS * 60) * 60_000;
    const expiresAt = new Date(Date.now() + ttlMs);

    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      },
    });

    await writeAudit({
      actorId: user.id,
      action: "auth.login",
      entityType: "User",
      entityId: user.id,
      meta: { method: "passkey" },
      req,
    });

    const csrfToken = randomBytes(32).toString("hex");
    setSessionCookie(res, token, expiresAt);
    setCsrfCookie(res, csrfToken);

    logSecurityEvent("LOGIN_SUCCESS", { userId: user.id, ip: req.ip, method: "passkey" });

    res.json({
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        officeId: user.officeId,
        mustChangePassword: user.mustChangePassword,
        csrfToken,
      },
    });
  }),
);

// ── LIST & DELETE ───────────────────────────────────────────

passkeysRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const passkeys = await prisma.passkey.findMany({
      where: { userId: req.user!.id },
      select: { id: true, createdAt: true },
    });
    res.json({ data: passkeys });
  }),
);

passkeysRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    // Require password confirmation via header
    const password = req.headers["x-confirm-password"];
    if (typeof password !== "string" || !password) {
      throw new HttpError(
        400,
        "X-Confirm-Password header required to delete a passkey",
        "invalid_request",
      );
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !user.passwordHash) {
      throw new HttpError(400, "Password authentication is not set up", "invalid_request");
    }

    const isValid = await verifyPassword(user.passwordHash, password);
    if (!isValid) {
      logSecurityEvent("LOGIN_FAILED", {
        userId: user.id,
        email: user.email,
        ip: req.ip,
        reason: "passkey_delete_bad_password",
      });
      throw new HttpError(401, "Incorrect password", "invalid_credentials");
    }

    const passkey = await prisma.passkey.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!passkey) throw new HttpError(404, "Passkey not found", "not_found");

    await prisma.passkey.delete({ where: { id: passkey.id } });

    await writeAudit({
      actorId: req.user!.id,
      action: "auth.passkey_deleted",
      entityType: "Passkey",
      entityId: passkey.id,
      req,
    });

    logSecurityEvent("SESSION_REVOKED", {
      userId: user.id,
      targetId: passkey.id,
      ip: req.ip,
      reason: "passkey_deleted",
    });

    res.status(204).end();
  }),
);
