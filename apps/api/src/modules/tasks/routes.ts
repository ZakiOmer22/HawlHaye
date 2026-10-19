import { Router, type Request } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTaskSchema, assignTaskSchema, transitionSchema } from "@hawl/shared";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/async";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/rbac";
import { HttpError } from "../../middleware/errors";
import {
  canAccessTask,
  createTask,
  assignTask,
  transitionTask,
  delegateTask,
  respondToDelegation,
  softDeleteTask,
  taskScopeFor,
} from "./service";

function pathParam(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw new HttpError(400, `Missing ${name}`, "invalid_request");
  return value;
}

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

tasksRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      ...taskScopeFor(req.user!),
    };
    if (req.query.mine === "true") {
      where.OR = [
        { ownerId: req.user!.id },
        { delegations: { some: { delegateId: req.user!.id, status: "ACCEPTED" } } },
      ];
    }
    if (typeof req.query.status === "string") {
      where.status = req.query.status as Prisma.TaskWhereInput["status"];
    }
    if (typeof req.query.officeId === "string") where.officeId = req.query.officeId;
    if (typeof req.query.categoryId === "string") where.categoryId = req.query.categoryId;
    if (typeof req.query.ownerId === "string") where.ownerId = req.query.ownerId;
    if (req.query.overdue === "true") {
      where.dueDate = { lt: new Date() };
      where.status = { not: "COMPLETED" };
    }
    if (typeof req.query.q === "string" && req.query.q.trim()) {
      const q = req.query.q.trim();
      where.AND = [
        {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
          ],
        },
      ];
    }

    const take = Math.min(Number(req.query.take ?? 100), 200);
    const skip = Number(req.query.skip ?? 0);
    const [data, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        take,
        skip,
        include: {
          owner: { select: { id: true, fullName: true } },
          category: { select: { id: true, name: true, color: true } },
          office: { select: { id: true, name: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);
    res.json({ data, meta: { total, take, skip } });
  }),
);

tasksRouter.get(
  "/board",
  asyncHandler(async (req, res) => {
    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      ...taskScopeFor(req.user!),
    };
    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      include: {
        owner: { select: { id: true, fullName: true } },
        category: { select: { id: true, name: true, color: true } },
      },
    });
    const columns: Record<string, typeof tasks> = {
      UNASSIGNED: [],
      ASSIGNED: [],
      IN_PROGRESS: [],
      BLOCKED: [],
      REVIEW: [],
      COMPLETED: [],
    };
    for (const t of tasks) {
      const bucket = columns[t.status];
      if (bucket) bucket.push(t);
    }
    res.json({ data: columns });
  }),
);

tasksRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createTaskSchema.parse(req.body);
    const task = await createTask(req.user!, input);
    res.status(201).json({ data: task });
  }),
);

tasksRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const task = await prisma.task.findUnique({
      where: { id: pathParam(req, "id") },
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
        createdBy: { select: { id: true, fullName: true } },
        assignedBy: { select: { id: true, fullName: true } },
        category: true,
        office: true,
        delegations: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!task || task.deletedAt) throw new HttpError(404, "Task not found", "not_found");
    if (!canAccessTask(req.user!, task)) throw new HttpError(403, "Forbidden", "forbidden");
    res.json({ data: task });
  }),
);

const updateTaskSchema = z
  .object({
    title: z.string().trim().min(3).max(200).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    categoryId: z.string().min(1).optional(),
    officeId: z.string().min(1).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    dueDate: z.coerce.date().nullable().optional(),
  })
  .strict();

tasksRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = pathParam(req, "id");
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.deletedAt) throw new HttpError(404, "Task not found", "not_found");
    const isLeadership = ["DEAN", "DEPUTY", "ADMINISTRATOR"].includes(req.user!.role);
    if (!isLeadership && task.ownerId !== req.user!.id && task.createdById !== req.user!.id) {
      throw new HttpError(403, "Forbidden", "forbidden");
    }
    const input = updateTaskSchema.parse(req.body);
    const updated = await prisma.task.update({ where: { id }, data: input });
    await prisma.taskEvent.create({
      data: {
        taskId: id,
        actorId: req.user!.id,
        type: "STATUS_CHANGED",
        note: "Details updated",
      },
    });
    res.json({ data: updated });
  }),
);

tasksRouter.post(
  "/:id/assign",
  requireRole("DEAN", "DEPUTY"),
  asyncHandler(async (req, res) => {
    const input = assignTaskSchema.parse(req.body);
    const task = await assignTask(req.user!, pathParam(req, "id"), input);
    res.json({ data: task });
  }),
);

tasksRouter.post(
  "/:id/transition",
  asyncHandler(async (req, res) => {
    const input = transitionSchema.parse(req.body);
    const task = await transitionTask(req.user!, pathParam(req, "id"), input);
    res.json({ data: task });
  }),
);

const delegateSchema = z
  .object({
    delegateId: z.string().min(1),
    reason: z.string().trim().min(3).max(1000).optional(),
  })
  .strict();

tasksRouter.post(
  "/:id/delegate",
  asyncHandler(async (req, res) => {
    const input = delegateSchema.parse(req.body);
    const d = await delegateTask(req.user!, pathParam(req, "id"), input);
    res.status(201).json({ data: d });
  }),
);

const respondSchema = z.object({ action: z.enum(["ACCEPTED", "DECLINED"]) }).strict();

tasksRouter.post(
  "/:id/delegation/:delegationId/respond",
  asyncHandler(async (req, res) => {
    const input = respondSchema.parse(req.body);
    const d = await respondToDelegation(
      req.user!,
      pathParam(req, "id"),
      pathParam(req, "delegationId"),
      input.action,
    );
    res.json({ data: d });
  }),
);

tasksRouter.get(
  "/:id/events",
  asyncHandler(async (req, res) => {
    const id = pathParam(req, "id");
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.deletedAt) throw new HttpError(404, "Task not found", "not_found");
    if (!canAccessTask(req.user!, task)) throw new HttpError(403, "Forbidden", "forbidden");
    const data = await prisma.taskEvent.findMany({
      where: { taskId: id },
      orderBy: { createdAt: "asc" },
      include: { actor: { select: { id: true, fullName: true } } },
    });
    res.json({ data });
  }),
);

const commentSchema = z.object({ body: z.string().trim().min(1).max(5000) }).strict();

tasksRouter.post(
  "/:id/comments",
  asyncHandler(async (req, res) => {
    const id = pathParam(req, "id");
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.deletedAt) throw new HttpError(404, "Task not found", "not_found");
    if (!canAccessTask(req.user!, task)) throw new HttpError(403, "Forbidden", "forbidden");
    const input = commentSchema.parse(req.body);
    const comment = await prisma.$transaction(async (tx) => {
      const c = await tx.comment.create({
        data: { taskId: id, authorId: req.user!.id, body: input.body },
      });
      await tx.taskEvent.create({
        data: { taskId: id, actorId: req.user!.id, type: "COMMENTED" },
      });
      return c;
    });
    res.status(201).json({ data: comment });
  }),
);

tasksRouter.get(
  "/:id/comments",
  asyncHandler(async (req, res) => {
    const id = pathParam(req, "id");
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.deletedAt) throw new HttpError(404, "Task not found", "not_found");
    if (!canAccessTask(req.user!, task)) throw new HttpError(403, "Forbidden", "forbidden");
    const data = await prisma.comment.findMany({
      where: { taskId: id, deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { id: true, fullName: true } } },
    });
    res.json({ data });
  }),
);

tasksRouter.delete(
  "/:id",
  requireRole("ADMINISTRATOR", "DEAN"),
  asyncHandler(async (req, res) => {
    await softDeleteTask(req.user!, pathParam(req, "id"));
    res.status(204).end();
  }),
);
