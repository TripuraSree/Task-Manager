import { Router } from "express";
import { supabaseAdmin } from "../config/supabase";
import type { AuthRequest } from "../types";
import { ensureAssigneeBelongsToProject, requireProjectRole } from "../utils/access";
import { asyncHandler } from "../utils/asyncHandler";
import { forbidden, notFound } from "../utils/httpError";
import { createTaskSchema, taskQuerySchema, updateTaskSchema, uuidParam } from "../utils/validators";

export const taskRouter = Router();

taskRouter.get(
  "/:taskId",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const taskId = uuidParam.parse(req.params.taskId);

    const { data: task, error } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!task) {
      throw notFound("Task not found");
    }

    await requireProjectRole(task.project_id, authReq.user.id, ["admin", "member"]);

    res.json({ task });
  })
);

taskRouter.patch(
  "/:taskId",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const taskId = uuidParam.parse(req.params.taskId);
    const payload = updateTaskSchema.parse(req.body);

    const { data: existingTask, error: existingTaskError } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .maybeSingle();

    if (existingTaskError) {
      throw existingTaskError;
    }

    if (!existingTask) {
      throw notFound("Task not found");
    }

    const role = await requireProjectRole(existingTask.project_id, authReq.user.id, ["admin", "member"]);

    if (role === "member") {
      const requestedFields = Object.keys(payload);
      const isOnlyStatusUpdate = requestedFields.length === 1 && requestedFields[0] === "status";
      const canUpdateStatus = existingTask.assignee_id === authReq.user.id;

      if (!isOnlyStatusUpdate || !canUpdateStatus) {
        throw forbidden("Members can only update status for tasks assigned to them");
      }
    }

    if (role === "admin") {
      await ensureAssigneeBelongsToProject(existingTask.project_id, payload.assigneeId);
    }

    const { data: task, error } = await supabaseAdmin
      .from("tasks")
      .update({
        title: payload.title,
        description: payload.description === undefined ? undefined : payload.description ?? null,
        assignee_id: payload.assigneeId === undefined ? undefined : payload.assigneeId ?? null,
        status: payload.status,
        priority: payload.priority,
        due_date: payload.dueDate === undefined ? undefined : payload.dueDate ?? null,
        updated_at: new Date().toISOString()
      })
      .eq("id", taskId)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    res.json({ task });
  })
);

taskRouter.delete(
  "/:taskId",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const taskId = uuidParam.parse(req.params.taskId);

    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("project_id")
      .eq("id", taskId)
      .maybeSingle();

    if (taskError) {
      throw taskError;
    }

    if (!task) {
      throw notFound("Task not found");
    }

    await requireProjectRole(task.project_id, authReq.user.id, ["admin"]);

    const { error } = await supabaseAdmin.from("tasks").delete().eq("id", taskId);

    if (error) {
      throw error;
    }

    res.status(204).send();
  })
);

export const projectTasksRouter = Router({ mergeParams: true });

projectTasksRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const projectId = uuidParam.parse(req.params.projectId);
    const payload = createTaskSchema.parse(req.body);

    await requireProjectRole(projectId, authReq.user.id, ["admin"]);
    await ensureAssigneeBelongsToProject(projectId, payload.assigneeId);

    const { data: task, error } = await supabaseAdmin
      .from("tasks")
      .insert({
        project_id: projectId,
        title: payload.title,
        description: payload.description ?? null,
        assignee_id: payload.assigneeId ?? null,
        created_by: authReq.user.id,
        status: payload.status,
        priority: payload.priority,
        due_date: payload.dueDate ?? null
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({ task });
  })
);

projectTasksRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const projectId = uuidParam.parse(req.params.projectId);
    const query = taskQuerySchema.parse(req.query);

    await requireProjectRole(projectId, authReq.user.id, ["admin", "member"]);

    let request = supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (query.status) {
      request = request.eq("status", query.status);
    }

    if (query.assigneeId) {
      request = request.eq("assignee_id", query.assigneeId);
    }

    if (query.overdue) {
      request = request.lt("due_date", new Date().toISOString().slice(0, 10)).neq("status", "done");
    }

    const { data: tasks, error } = await request;

    if (error) {
      throw error;
    }

    res.json({ tasks });
  })
);
