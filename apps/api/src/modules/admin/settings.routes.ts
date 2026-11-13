// apps/api/src/modules/admin/settings.routes.ts
import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/async";
import { HttpError } from "../../middleware/errors";
import { writeAudit } from "../../lib/audit";
import { invalidateSettingsCache } from "../../middleware/settings";

export const settingsRouter = Router();

settingsRouter.use(requireAuth);
settingsRouter.use((req, _res, next) => {
  if (req.user?.role !== "ADMINISTRATOR") {
    return next(new HttpError(403, "SysAdmin access required.", "forbidden"));
  }
  next();
});

// Define the default matrix here in the backend
const DEFAULT_PERMISSIONS = {
  DEAN: {
    "/board": true,
    "/my-tasks": true,
    "/delegations": true,
    "/review": true,
    "/dashboard": true,
    "/reports": true,
  },
  DEPUTY: {
    "/board": true,
    "/my-tasks": true,
    "/delegations": true,
    "/review": true,
    "/dashboard": true,
    "/reports": true,
  },
  FACULTY_COORDINATOR: {
    "/board": true,
    "/my-tasks": true,
    "/delegations": true,
    "/review": true,
    "/dashboard": true,
    "/reports": false,
  },
  LABS_COORDINATOR: {
    "/board": true,
    "/my-tasks": true,
    "/delegations": true,
    "/review": true,
    "/dashboard": true,
    "/reports": false,
  },
  LAB_TECHNICIAN: {
    "/board": true,
    "/my-tasks": true,
    "/delegations": false,
    "/review": false,
    "/dashboard": false,
    "/reports": false,
  },
};

settingsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    let settings = await prisma.systemSettings.findUnique({
      where: { id: "global" },
    });

    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { id: "global" },
      });
    }

    // If the DB is empty, return the defaults so the frontend renders them
    const dbPerms = settings.pagePermissions as Record<string, Record<string, boolean>> | null;

    if (!dbPerms || Object.keys(dbPerms).length === 0) {
      settings = { ...settings, pagePermissions: DEFAULT_PERMISSIONS };
    }

    res.json({ data: settings });
  }),
);

const updateSettingsSchema = z.object({
  universityName: z.string().min(2).max(100),
  supportEmail: z.string().email(),
  timezone: z.string().min(2),
  logoUrl: z.string().url().or(z.string().startsWith("/")).nullable().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),
  maintenanceMode: z.boolean(),
  allowRegistration: z.boolean(),
  emailNotifications: z.boolean(),
  storageLimitMb: z.number().int().min(100).max(1048576),
  enforce2FA: z.boolean(),
  maxLoginAttempts: z.number().int().min(1).max(20),
  sessionTimeout: z.number().int().min(5).max(1440),
  pagePermissions: z.record(z.string(), z.record(z.string(), z.boolean())).optional(),
});

settingsRouter.put(
  "/",
  asyncHandler(async (req, res) => {
    const input = updateSettingsSchema.parse(req.body);

    const permissionsJson = input.pagePermissions
      ? (input.pagePermissions as Prisma.InputJsonValue)
      : undefined;

    const settings = await prisma.systemSettings.upsert({
      where: { id: "global" },
      update: {
        universityName: input.universityName,
        supportEmail: input.supportEmail,
        timezone: input.timezone,
        logoUrl: input.logoUrl,
        primaryColor: input.primaryColor,
        maintenanceMode: input.maintenanceMode,
        allowRegistration: input.allowRegistration,
        emailNotifications: input.emailNotifications,
        storageLimitMb: input.storageLimitMb,
        enforce2FA: input.enforce2FA,
        maxLoginAttempts: input.maxLoginAttempts,
        sessionTimeout: input.sessionTimeout,
        ...(permissionsJson && { pagePermissions: permissionsJson }),
      },
      create: {
        id: "global",
        universityName: input.universityName,
        supportEmail: input.supportEmail,
        timezone: input.timezone,
        logoUrl: input.logoUrl,
        primaryColor: input.primaryColor,
        maintenanceMode: input.maintenanceMode,
        allowRegistration: input.allowRegistration,
        emailNotifications: input.emailNotifications,
        storageLimitMb: input.storageLimitMb,
        enforce2FA: input.enforce2FA,
        maxLoginAttempts: input.maxLoginAttempts,
        sessionTimeout: input.sessionTimeout,
        ...(permissionsJson && { pagePermissions: permissionsJson }),
      },
    });

    invalidateSettingsCache();

    await writeAudit({
      actorId: req.user!.id,
      action: "admin.settings_updated",
      entityType: "SystemSettings",
      entityId: settings.id,
      meta: {
        maintenanceMode: settings.maintenanceMode,
        enforce2FA: settings.enforce2FA,
        maxLoginAttempts: settings.maxLoginAttempts,
        sessionTimeout: settings.sessionTimeout,
        storageLimitMb: settings.storageLimitMb,
        changedFields: Object.keys(input),
      },
      req,
    });

    res.json({ data: settings });
  }),
);

// ── LOGO UPLOAD ENDPOINT ──────────────────────────────────────

// Ensure the uploads directory exists
const uploadDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/svg+xml", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPG, PNG, SVG, and WEBP are allowed."));
    }
  },
});

settingsRouter.post(
  "/logo",
  upload.single("logo"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new HttpError(400, "No file uploaded", "invalid_request");
    }

    const logoUrl = `/uploads/${req.file.filename}`;

    await prisma.systemSettings.update({
      where: { id: "global" },
      data: { logoUrl },
    });

    invalidateSettingsCache();

    res.json({ data: { logoUrl } });
  }),
);
