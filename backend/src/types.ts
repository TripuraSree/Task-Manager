import type { Request } from "express";

export type ProjectRole = "admin" | "member";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export type AuthUser = {
  id: string;
  email?: string;
};

export type AuthRequest = Request & {
  user: AuthUser;
};
