import { z } from "zod";

export const uuidParam = z.string().uuid();

export const createProjectSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().nullable()
});

export const updateProjectSchema = createProjectSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  "Provide at least one field to update"
);

export const addMemberSchema = z.object({
  userId: z.string().uuid().optional(),
  email: z.string().trim().email().optional(),
  role: z.enum(["admin", "member"]).default("member")
}).refine((data) => data.userId || data.email, "Provide either userId or email");

export const updateMemberSchema = z.object({
  role: z.enum(["admin", "member"])
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  status: z.enum(["todo", "in_progress", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.string().date().optional().nullable()
});

export const updateTaskSchema = createTaskSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  "Provide at least one field to update"
);

export const taskQuerySchema = z.object({
  status: z.enum(["todo", "in_progress", "done"]).optional(),
  assigneeId: z.string().uuid().optional(),
  overdue: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true")
});
