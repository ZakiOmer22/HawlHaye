import type { Request } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

type AuditInput = {
  actorId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  meta?: Prisma.InputJsonValue;
  req?: Request;
};

export async function writeAudit(input: AuditInput) {
  const { req, meta, ...rest } = input;
  return prisma.auditLog.create({
    data: {
      ...rest,
      ip: req?.ip,
      userAgent: req?.get("user-agent"),
      meta,
    },
  });
}
