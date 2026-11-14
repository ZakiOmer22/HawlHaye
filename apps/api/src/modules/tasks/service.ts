// apps/api/src/modules/tasks/service.ts
import type { Prisma, Task } from "@prisma/client";
import type { Request } from "express"; // Import Request type
import { canTransition } from "@hawl/shared";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../middleware/errors";
import { emitNotification, emitBoardChanged } from "../../lib/events";
import { writeAudit } from "../../lib/audit";

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
  req?: Request, // Fixed: Changed from any to Request
): Promise<Task> {
  const task = await prisma.$transaction(async (tx) => {
    const code = await nextTaskCode(tx);
    const t = await tx.task.create({
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
      data: { taskId: t.id, actorId: actor.id, type: "CREATED", toValue: "UNASSIGNED" },
    });
    return t;
  });

  await writeAudit({
    actorId: actor.id,
    action: "task.created",
    entityType: "Task",
    entityId: task.id,
    meta: { title: task.title, code: task.code },
    req,
  });

  emitBoardChanged();
  return task;
}

export async function assignTask(
  actor: NonNullable<Express.Request["user"]>,
  taskId: string,
  input: { ownerId: string; priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"; dueDate: Date },
  req?: Request, // Fixed
): Promise<Task> {
  const updated = await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({ where: { id: taskId } });
    if (!task || task.deletedAt) throw new HttpError(404, "Task not found", "not_found");

    const owner = await tx.user.findUnique({ where: { id: input.ownerId } });
    if (!owner || !owner.active) throw new HttpError(400, "Owner not valid", "invalid_owner");

    const transitionCheck = canTransition(actor, { ...task, delegateId: null }, "ASSIGNED");
    if (!transitionCheck.ok) {
      throw new HttpError(
        400,
        transitionCheck.reason || "Cannot assign from the current status",
        "invalid_transition",
      );
    }

    const u = await tx.task.update({
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
    return u;
  });

  await writeAudit({
    actorId: actor.id,
    action: "task.assigned",
    entityType: "Task",
    entityId: taskId,
    meta: { ownerId: input.ownerId, priority: input.priority },
    req,
  });

  emitNotification(input.ownerId, {
    type: "TASK_ASSIGNED",
    title: "New Task Assigned",
    message: `You have been assigned to "${updated.title}"`,
    link: `/tasks/${taskId}`,
  });
  emitBoardChanged();
  return updated;
}

export async function transitionTask(
  actor: NonNullable<Express.Request["user"]>,
  taskId: string,
  input: { to: Task["status"]; reason?: string },
  req?: Request, // Fixed
): Promise<Task> {
  const updated = await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({ where: { id: taskId } });
    if (!task || task.deletedAt) throw new HttpError(404, "Task not found", "not_found");

    const transitionCheck = canTransition(actor, { ...task, delegateId: null }, input.to);
    if (!transitionCheck.ok) {
      throw new HttpError(
        400,
        transitionCheck.reason || `You cannot move a task from ${task.status} to ${input.to}`,
        "invalid_transition",
      );
    }

    if (input.to === "ASSIGNED") {
      if (!task.ownerId) {
        throw new HttpError(
          400,
          "You must assign an owner before moving this task to ASSIGNED.",
          "missing_owner",
        );
      }
      if (!task.dueDate) {
        throw new HttpError(
          400,
          "You must set a due date before moving this task to ASSIGNED.",
          "missing_due_date",
        );
      }
    }

    const data: Prisma.TaskUpdateInput = { status: input.to };
    if (input.to === "BLOCKED") data.blockedReason = input.reason ?? null;
    if (task.status === "BLOCKED" && input.to !== "BLOCKED") data.blockedReason = null;
    if (input.to === "COMPLETED") data.completedAt = new Date();
    if (task.status === "COMPLETED" && input.to !== "COMPLETED") data.completedAt = null;

    const u = await tx.task.update({ where: { id: taskId }, data });
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
    return u;
  });

  await writeAudit({
    actorId: actor.id,
    action: "task.transitioned",
    entityType: "Task",
    entityId: taskId,
    meta: { to: input.to, reason: input.reason },
    req,
  });

  if (updated.ownerId && updated.ownerId !== actor.id) {
    emitNotification(updated.ownerId, {
      type: "TASK_TRANSITIONED",
      title: "Task Status Updated",
      message: `Your task "${updated.title}" is now ${input.to}`,
      link: `/tasks/${taskId}`,
    });
  }
  emitBoardChanged();
  return updated;
}

export async function delegateTask(
  actor: NonNullable<Express.Request["user"]>,
  taskId: string,
  input: { delegateId: string; reason?: string },
  req?: Request, // Fixed
) {
  const delegation = await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({ where: { id: taskId } });
    if (!task || task.deletedAt) throw new HttpError(404, "Task not found", "not_found");
    if (task.ownerId !== actor.id) {
      throw new HttpError(403, "Only the current owner can delegate", "forbidden");
    }
    if (input.delegateId === actor.id) {
      throw new HttpError(400, "You cannot delegate to yourself", "invalid_request");
    }

    const existingPending = await tx.delegation.findFirst({
      where: { taskId, status: "PENDING" },
    });
    if (existingPending) {
      throw new HttpError(400, "There is already a pending delegation for this task.", "conflict");
    }

    const delegate = await tx.user.findUnique({ where: { id: input.delegateId } });
    if (!delegate || !delegate.active) {
      throw new HttpError(400, "Delegate not valid", "invalid_delegate");
    }

    const d = await tx.delegation.create({
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
    return d;
  });

  await writeAudit({
    actorId: actor.id,
    action: "task.delegated",
    entityType: "Task",
    entityId: taskId,
    meta: { delegateId: input.delegateId, reason: input.reason },
    req,
  });

  emitNotification(input.delegateId, {
    type: "DELEGATION_RECEIVED",
    title: "New Delegation Request",
    message: `You received a delegation request for task "${taskId}"`,
    link: `/delegations`,
  });
  emitBoardChanged();
  return delegation;
}

export async function respondToDelegation(
  actor: NonNullable<Express.Request["user"]>,
  taskId: string,
  delegationId: string,
  action: "ACCEPTED" | "DECLINED",
  req?: Request, // Fixed
) {
  const result = await prisma.$transaction(async (tx) => {
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

    if (action === "ACCEPTED") {
      const task = await tx.task.findUnique({ where: { id: taskId } });
      if (!task) throw new HttpError(404, "Task not found", "not_found");

      if (task.ownerId !== delegation.delegatedById) {
        throw new HttpError(
          400,
          "The task has been reassigned by an admin, so this delegation is no longer valid.",
          "invalid_request",
        );
      }

      await tx.task.update({
        where: { id: taskId },
        data: { ownerId: delegation.delegateId },
      });
    }

    const u = await tx.delegation.update({
      where: { id: delegationId },
      data: {
        status: action,
        respondedAt: new Date(),
        endedAt: action === "ACCEPTED" ? null : new Date(),
      },
    });

    await tx.taskEvent.create({
      data: {
        taskId,
        actorId: actor.id,
        type: action === "ACCEPTED" ? "DELEGATION_ACCEPTED" : "DELEGATION_DECLINED",
      },
    });

    const actorUser = await tx.user.findUnique({
      where: { id: actor.id },
      select: { fullName: true },
    });

    return { u, delegation, actorName: actorUser?.fullName ?? "Someone" };
  });

  await writeAudit({
    actorId: actor.id,
    action: `task.delegation_${action.toLowerCase()}`,
    entityType: "Task",
    entityId: taskId,
    meta: { delegationId },
    req,
  });

  emitNotification(result.delegation.delegatedById, {
    type: "TASK_TRANSITIONED",
    title: `Delegation ${action === "ACCEPTED" ? "Accepted" : "Declined"}`,
    message: `${result.actorName} has ${action.toLowerCase()} the delegation request.`,
    link: `/tasks/${taskId}`,
  });
  emitBoardChanged();
  return result.u;
}

export async function softDeleteTask(
  actor: NonNullable<Express.Request["user"]>,
  taskId: string,
  req?: Request, // Fixed
) {
  const updated = await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({ where: { id: taskId } });
    if (!task || task.deletedAt) throw new HttpError(404, "Task not found", "not_found");
    const u = await tx.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });
    await tx.taskEvent.create({
      data: { taskId, actorId: actor.id, type: "SOFT_DELETED" },
    });
    return u;
  });

  await writeAudit({
    actorId: actor.id,
    action: "task.deleted",
    entityType: "Task",
    entityId: taskId,
    req,
  });

  emitBoardChanged();
  return updated;
}
