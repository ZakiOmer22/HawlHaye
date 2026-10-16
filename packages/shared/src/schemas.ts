import { z } from "zod";
import { PRIORITIES, TASK_STATUSES } from "./status";

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
});

export const createTaskSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().max(5000).optional(),
    categoryId: z.string().min(1),
    officeId: z.string().min(1),
    priority: z.enum(PRIORITIES).default("MEDIUM"),
    dueDate: z.coerce.date().optional(),
  })
  .strict();

export const assignTaskSchema = z
  .object({
    ownerId: z.string().min(1),
    priority: z.enum(PRIORITIES),
    dueDate: z.coerce.date(),
  })
  .strict();

export const transitionSchema = z
  .object({
    to: z.enum(TASK_STATUSES),
    reason: z.string().trim().min(3).max(1000).optional(),
  })
  .strict()
  .refine((v) => v.to !== "BLOCKED" || !!v.reason, {
    message: "A reason is required when blocking a task",
    path: ["reason"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type AssignTaskInput = z.infer<typeof assignTaskSchema>;
export type TransitionInput = z.infer<typeof transitionSchema>;
