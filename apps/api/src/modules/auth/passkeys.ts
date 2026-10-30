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
import { logger } from "../../lib/logger";

const rpID = env.NODE_ENV === "production" ? new URL(env.WEB_ORIGIN).hostname : "localhost";
const expectedOrigin = env.WEB_ORIGIN;

export const passkeysRouter = Router();

passkeysRouter.get(
  "/register/options",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { passkeys: true },
    });
    if (!user) throw new HttpError(404, "User not found", "not_found");

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
        userVerification: "preferred",
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

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge: expectedChallenge.challenge,
        expectedOrigin,
        expectedRPID: rpID,
        requireUserVerification: false,
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

    logSecurityEvent("2FA_ENABLED", { userId: req.user!.id, ip: req.ip, method: "passkey" });
    res.json({ data: { verified: true } });
  }),
);

passkeysRouter.post(
  "/login/options",
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) throw new HttpError(400, "Email required", "invalid_request");

    const user = await prisma.user.findUnique({
      where: { email },
      include: { passkeys: true },
    });

    if (!user || user.passkeys.length === 0) {
      throw new HttpError(404, "No passkeys found for this user", "not_found");
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: user.passkeys.map((pk) => ({
        id: pk.credentialID,
        type: "public-key",
        transports: pk.transports
          ? (pk.transports.split(",") as AuthenticatorTransport[])
          : undefined,
      })),
      userVerification: "preferred",
    });

    await prisma.passkeyChallenge.create({
      data: { userId: user.id, challenge: options.challenge },
    });

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
    if (!passkey) throw new HttpError(404, "Passkey not found", "not_found");

    const expectedChallenge = await prisma.passkeyChallenge.findFirst({
      where: { userId: passkey.userId },
      orderBy: { createdAt: "desc" },
    });
    if (!expectedChallenge) throw new HttpError(400, "Challenge not found", "invalid_request");

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
        requireUserVerification: false,
      });
    } catch (error) {
      logger.error({ error }, "Passkey authentication verification failed");
      throw new HttpError(400, (error as Error).message, "invalid_passkey");
    }

    const { verified, authenticationInfo } = verification;
    if (!verified) throw new HttpError(400, "Passkey verification failed", "invalid_passkey");

    await prisma.passkey.update({
      where: { id: passkey.id },
      data: { counter: authenticationInfo.newCounter },
    });
    await prisma.passkeyChallenge.delete({ where: { id: expectedChallenge.id } });

    const user = passkey.user;
    const token = generateToken();
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 3600_000);

    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      },
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
    await prisma.passkey.delete({
      where: { id: req.params.id, userId: req.user!.id },
    });
    res.status(204).end();
  }),
);
