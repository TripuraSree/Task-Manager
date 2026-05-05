import { supabaseAdmin } from "../config/supabase";
import type { ProjectRole } from "../types";
import { forbidden, notFound } from "./httpError";

export const getProjectRole = async (projectId: string, userId: string): Promise<ProjectRole | null> => {
  const { data, error } = await supabaseAdmin
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.role ?? null;
};

export const requireProjectRole = async (
  projectId: string,
  userId: string,
  allowedRoles: ProjectRole[]
) => {
  const role = await getProjectRole(projectId, userId);

  if (!role) {
    throw notFound("Project not found");
  }

  if (!allowedRoles.includes(role)) {
    throw forbidden();
  }

  return role;
};

export const ensureAssigneeBelongsToProject = async (projectId: string, assigneeId?: string | null) => {
  if (!assigneeId) {
    return;
  }

  const role = await getProjectRole(projectId, assigneeId);
  if (!role) {
    throw forbidden("Assignee must be a member of the project");
  }
};
