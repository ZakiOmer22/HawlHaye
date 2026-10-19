import type { Prisma, Task } from "@prisma/client";
import { canTransition } from "@hawl/shared";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errors";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const canTransitionRaw = canTransition as unknown as (...args: any[]) => boolean;

const LEADERSHIP = ["DEAN", "DEPUTY", "ADMINISTRATOR"] as const;
const COORDINATOR = ["FACULTY_COORDINATOR", "LABS_COORDINATOR"] as const;

export function canAccessTask(user: NonNullable<Express.Request["user"]>, task: Task): boolean {
  if ((LEADERSHIP as readonly string[]).includes(user.role)) return true;
  if ((COORDINATOR as readonly string[]).includes(user.role)) {
    return task.officeId === user.officeId;
  }
  return task.ownerId === user.id || task.createdById === user.id;
}

export function taskScopeFor(user: NonNullable<Express.Request["user"]>): Prisma.TaskWhereInput {
  if ((LEADERSHIP as readonly string[]).includes(user.role)) return {};
  if ((COORDINATOR as readonly string[]).includes(user.role)) {
    return { officeId: user.officeId ?? "__none__" };
  }
  return { OR: [{ ownerId: user.id }, { createdById: user.id }] };
}

async function nextTaskCode(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await tx.taskCodeSequence.upsert({
    where: { year },
    create: { year, lastSeq: 1 },
    update: { lastSeq: { increment: 1 } },
  });
  return `CECIT-${year}-${String(seq.lastSeq).padStart(3, "0")}`;
}

export type CreateTaskInputInternal = {
  title: string;
  description?: string;
  categoryId: string;
  officeId: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: Date;
};

export async function createTask(
  actor: NonNullable<Express.Request["user"]>,
  input: CreateTaskInputInternal,
): Promise<Task> {
  return prisma.$transaction(async (tx) => {
    const code = await nextTaskCode(tx);
    const task = await tx.task.create({
      data: {
        code,
        title: input.title,
        description: input.description,
        categoryId: input.categoryId,
        officeId: input.officeId,
        priority: input.priority,
        dueDate: input.dueDate,
        createdById: actor.id,
      },
    });
    await tx.taskEvent.create({
      data: { taskId: task.id, actorId: actor.id, type: "CREATED", toValue: "UNASSIGNED" },
    });
    return task;
  });
}

export async function assignTask(
  actor: NonNullable<Express.Request["user"]>,
  taskId: string,
  input: { ownerId: string; priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"; dueDate: Date },
): Promise<Task> {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({ where: { id: taskId } });
    if (!task || task.deletedAt) throw new HttpError(404, "Task not found", "not_found");

    const owner = await tx.user.findUnique({ where: { id: input.ownerId } });
    if (!owner || !owner.active) throw new HttpError(400, "Owner not valid", "invalid_owner");

    if (!canTransitionRaw(actor, task, "ASSIGNED")) {
      throw new HttpError(400, "Cannot assign from the current status", "invalid_transition");
    }

    const updated = await tx.task.update({
      where: { id: taskId },
      data: {
        ownerId: input.ownerId,
        assignedById: actor.id,
        priority: input.priority,
        dueDate: input.dueDate,
        status: "ASSIGNED",
      },
    });
    await tx.taskEvent.create({
      data: {
        taskId,
        actorId: actor.id,
        type: "ASSIGNED",
        fromValue: task.status,
        toValue: "ASSIGNED",
        note: `Assigned to ${owner.fullName}`,
      },
    });
    return updated;
  });
}

export async function transitionTask(
  actor: NonNullable<Express.Request["user"]>,
  taskId: string,
  input: { to: Task["status"]; reason?: string },
): Promise<Task> {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({ where: { id: taskId } });
    if (!task || task.deletedAt) throw new HttpError(404, "Task not found", "not_found");

    if (!canTransitionRaw(actor, task, input.to)) {
      throw new HttpError(
        400,
        `You cannot move a task from ${task.status} to ${input.to}`,
        "invalid_transition",
      );
    }

    const data: Prisma.TaskUpdateInput = { status: input.to };
    if (input.to === "BLOCKED") data.blockedReason = input.reason ?? null;
    if (task.status === "BLOCKED" && input.to !== "BLOCKED") data.blockedReason = null;
    if (input.to === "COMPLETED") data.completedAt = new Date();
    if (task.status === "COMPLETED" && input.to !== "COMPLETED") data.completedAt = null;

    const updated = await tx.task.update({ where: { id: taskId }, data });
    await tx.taskEvent.create({
      data: {
        taskId,
        actorId: actor.id,
        type: "STATUS_CHANGED",
        fromValue: task.status,
        toValue: input.to,
        note: input.reason,
      },
    });
    return updated;
  });
}

export async function delegateTask(
  actor: NonNullable<Express.Request["user"]>,
  taskId: string,
  input: { delegateId: string; reason?: string },
) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({ where: { id: taskId } });
    if (!task || task.deletedAt) throw new HttpError(404, "Task not found", "not_found");
    if (task.ownerId !== actor.id) {
      throw new HttpError(403, "Only the current owner can delegate", "forbidden");
    }
    if (input.delegateId === actor.id) {
      throw new HttpError(400, "You cannot delegate to yourself", "invalid_request");
    }
    const delegate = await tx.user.findUnique({ where: { id: input.delegateId } });
    if (!delegate || !delegate.active) {
      throw new HttpError(400, "Delegate not valid", "invalid_delegate");
    }

    const delegation = await tx.delegation.create({
      data: {
        taskId,
        delegateId: input.delegateId,
        delegatedById: actor.id,
        reason: input.reason,
        status: "PENDING",
      },
    });
    await tx.taskEvent.create({
      data: {
        taskId,
        actorId: actor.id,
        type: "DELEGATED",
        note: `Delegated to ${delegate.fullName}${input.reason ? `: ${input.reason}` : ""}`,
      },
    });
    return delegation;
  });
}

export async function respondToDelegation(
  actor: NonNullable<Express.Request["user"]>,
  taskId: string,
  delegationId: string,
  action: "ACCEPTED" | "DECLINED",
) {
  return prisma.$transaction(async (tx) => {
    const delegation = await tx.delegation.findUnique({ where: { id: delegationId } });
    if (!delegation || delegation.taskId !== taskId) {
      throw new HttpError(404, "Delegation not found", "not_found");
    }
    if (delegation.delegateId !== actor.id) {
      throw new HttpError(403, "Only the delegate can respond", "forbidden");
    }
    if (delegation.status !== "PENDING") {
      throw new HttpError(400, "Delegation already answered", "invalid_request");
    }

    const updated = await tx.delegation.update({
      where: { id: delegationId },
      data: {
        status: action,
        respondedAt: new Date(),
        endedAt: action === "ACCEPTED" ? null : new Date(),
      },
    });

    if (action === "ACCEPTED") {
      await tx.task.update({
        where: { id: taskId },
        data: { ownerId: delegation.delegateId },
      });
    }
    await tx.taskEvent.create({
      data: {
        taskId,
        actorId: actor.id,
        type: action === "ACCEPTED" ? "DELEGATION_ACCEPTED" : "DELEGATION_DECLINED",
      },
    });
    return updated;
  });
}

export async function softDeleteTask(actor: NonNullable<Express.Request["user"]>, taskId: string) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({ where: { id: taskId } });
    if (!task || task.deletedAt) throw new HttpError(404, "Task not found", "not_found");
    const updated = await tx.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });
    await tx.taskEvent.create({
      data: { taskId, actorId: actor.id, type: "SOFT_DELETED" },
    });
    return updated;
  });
}
