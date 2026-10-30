import { z } from "zod";
import xss from "xss";
import { PRIORITIES, TASK_STATUSES } from "./status";

// Reusable sanitizer to prevent XSS
const sanitizedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((val) => xss(val));

export const loginSchema = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(200),
  })
  .strict();

export const createTaskSchema = z
  .object({
    title: sanitizedString(200).pipe(z.string().min(3)),
    description: sanitizedString(5000).optional(),
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
    reason: sanitizedString(1000).optional(),
  })
  .strict()
  .refine((v) => v.to !== "BLOCKED" || !!v.reason, {
    message: "A reason is required when blocking a task",
    path: ["reason"],
  });

export const createOfficeSchema = z
  .object({
    name: sanitizedString(100).pipe(z.string().min(2)),
    type: z.enum(["FACULTY", "LABS", "ADMINISTRATION"]),
  })
  .strict();

export const createCategorySchema = z
  .object({
    name: sanitizedString(80).pipe(z.string().min(2)),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a valid hex code like #e8bc69")
      .optional(),
  })
  .strict();

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(200)
  .refine(
    (p) => /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p),
    "Password must include upper, lower, and a digit",
  );

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type AssignTaskInput = z.infer<typeof assignTaskSchema>;
export type TransitionInput = z.infer<typeof transitionSchema>;
export type CreateOfficeInput = z.infer<typeof createOfficeSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
