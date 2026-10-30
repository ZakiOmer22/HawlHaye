import { z } from "zod";

/**
 * Password policy schema.
 * Lives in the API (not @hawl/shared) because it must use the SAME zod
 * instance as every `z.object({...})` that contains it. Crossing a
 * package boundary leaks zod's class identity and makes TS reject it.
 */
export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password must be at most 128 characters")
  .refine(
    (p) => /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p),
    "Password must include upper, lower, and a digit",
  );
