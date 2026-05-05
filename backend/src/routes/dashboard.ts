import { Router } from "express";
import { supabaseAdmin } from "../config/supabase";
import type { AuthRequest } from "../types";
import { asyncHandler } from "../utils/asyncHandler";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const today = new Date().toISOString().slice(0, 10);

    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from("project_members")
      .select("project_id, role")
      .eq("user_id", authReq.user.id);

    if (membershipError) {
      throw membershipError;
    }

    const projectIds = memberships.map((membership) => membership.project_id);

    if (projectIds.length === 0) {
      return res.json({
        projects: 0,
        tasks: { total: 0, todo: 0, inProgress: 0, done: 0, overdue: 0 },
        assignedToMe: 0,
        memberships: []
      });
    }

    const { data: tasks, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("id, status, due_date, assignee_id")
      .in("project_id", projectIds);

    if (taskError) {
      throw taskError;
    }

    const summary = tasks.reduce(
      (acc, task) => {
        acc.total += 1;
        if (task.status === "todo") acc.todo += 1;
        if (task.status === "in_progress") acc.inProgress += 1;
        if (task.status === "done") acc.done += 1;
        if (task.due_date && task.due_date < today && task.status !== "done") acc.overdue += 1;
        if (task.assignee_id === authReq.user.id) acc.assignedToMe += 1;
        return acc;
      },
      { total: 0, todo: 0, inProgress: 0, done: 0, overdue: 0, assignedToMe: 0 }
    );

    res.json({
      projects: projectIds.length,
      tasks: {
        total: summary.total,
        todo: summary.todo,
        inProgress: summary.inProgress,
        done: summary.done,
        overdue: summary.overdue
      },
      assignedToMe: summary.assignedToMe,
      memberships
    });
  })
);
