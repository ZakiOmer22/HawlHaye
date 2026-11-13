import { Router } from "express";
import { z } from "zod";
import { sendContactEmail } from "../../lib/mailer";
import { asyncHandler } from "../../middleware/async";
import { requireAuth } from "../../middleware/auth";

export const contactRouter = Router();

const contactSchema = z
  .object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(5),
    company: z.string().min(2),
    inquiryType: z.string(),
    message: z.string().min(10),
  })
  .strict();

// Users must be logged in to contact sales
contactRouter.use(requireAuth);

contactRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = contactSchema.parse(req.body);

    await sendContactEmail(
      input.name,
      input.email,
      input.phone,
      input.company,
      input.inquiryType,
      input.message,
    );

    res.status(204).end();
  }),
);
