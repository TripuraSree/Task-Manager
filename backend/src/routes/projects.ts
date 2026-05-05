import { Router } from "express";
import { supabaseAdmin } from "../config/supabase";
import type { AuthRequest } from "../types";
import { requireProjectRole } from "../utils/access";
import { asyncHandler } from "../utils/asyncHandler";
import { badRequest, forbidden, notFound } from "../utils/httpError";
import { getUserEmailsById, resolveUserId } from "../utils/users";
import {
  addMemberSchema,
  createProjectSchema,
  updateMemberSchema,
  updateProjectSchema,
  uuidParam
} from "../utils/validators";

export const projectRouter = Router();

projectRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const payload = createProjectSchema.parse(req.body);

    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .insert({
        name: payload.name,
        description: payload.description ?? null,
        owner_id: authReq.user.id
      })
      .select("*")
      .single();

    if (projectError) {
      throw projectError;
    }

    const { error: memberError } = await supabaseAdmin.from("project_members").insert({
      project_id: project.id,
      user_id: authReq.user.id,
      role: "admin"
    });

    if (memberError) {
      throw memberError;
    }

    res.status(201).json({ project });
  })
);

projectRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;

    const { data, error } = await supabaseAdmin
      .from("project_members")
      .select("role, projects(id, name, description, owner_id, created_at, updated_at)")
      .eq("user_id", authReq.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    res.json({ projects: data });
  })
);

projectRouter.get(
  "/:projectId",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const projectId = uuidParam.parse(req.params.projectId);

    const role = await requireProjectRole(projectId, authReq.user.id, ["admin", "member"]);

    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (error) {
      throw error;
    }

    res.json({ project, role });
  })
);

projectRouter.patch(
  "/:projectId",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const projectId = uuidParam.parse(req.params.projectId);
    const payload = updateProjectSchema.parse(req.body);

    await requireProjectRole(projectId, authReq.user.id, ["admin"]);

    const { data: project, error } = await supabaseAdmin
      .from("projects")
      .update({
        ...payload,
        description: payload.description === undefined ? undefined : payload.description ?? null,
        updated_at: new Date().toISOString()
      })
      .eq("id", projectId)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    res.json({ project });
  })
);

projectRouter.delete(
  "/:projectId",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const projectId = uuidParam.parse(req.params.projectId);

    await requireProjectRole(projectId, authReq.user.id, ["admin"]);

    const { error } = await supabaseAdmin.from("projects").delete().eq("id", projectId);

    if (error) {
      throw error;
    }

    res.status(204).send();
  })
);

projectRouter.get(
  "/:projectId/members",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const projectId = uuidParam.parse(req.params.projectId);

    await requireProjectRole(projectId, authReq.user.id, ["admin", "member"]);

    const { data: members, error } = await supabaseAdmin
      .from("project_members")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    const emailsById = await getUserEmailsById(members.map((member) => member.user_id));

    res.json({
      members: members.map((member) => ({
        ...member,
        email: emailsById.get(member.user_id)
      }))
    });
  })
);

projectRouter.post(
  "/:projectId/members",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const projectId = uuidParam.parse(req.params.projectId);
    const payload = addMemberSchema.parse(req.body);

    await requireProjectRole(projectId, authReq.user.id, ["admin"]);
    const userId = await resolveUserId(payload);

    const { data: member, error } = await supabaseAdmin
      .from("project_members")
      .insert({
        project_id: projectId,
        user_id: userId,
        role: payload.role
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({ member });
  })
);

projectRouter.patch(
  "/:projectId/members/:memberId",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const projectId = uuidParam.parse(req.params.projectId);
    const memberId = uuidParam.parse(req.params.memberId);
    const payload = updateMemberSchema.parse(req.body);

    await requireProjectRole(projectId, authReq.user.id, ["admin"]);

    const { count: adminCount, error: countError } = await supabaseAdmin
      .from("project_members")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("role", "admin");

    if (countError) {
      throw countError;
    }

    const { data: currentMember, error: currentMemberError } = await supabaseAdmin
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", memberId)
      .maybeSingle();

    if (currentMemberError) {
      throw currentMemberError;
    }

    if (!currentMember) {
      throw notFound("Member not found");
    }

    if (currentMember.role === "admin" && payload.role === "member" && adminCount === 1) {
      throw badRequest("A project must have at least one admin");
    }

    const { data: member, error } = await supabaseAdmin
      .from("project_members")
      .update({ role: payload.role })
      .eq("project_id", projectId)
      .eq("user_id", memberId)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    res.json({ member });
  })
);

projectRouter.delete(
  "/:projectId/members/:memberId",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;
    const projectId = uuidParam.parse(req.params.projectId);
    const memberId = uuidParam.parse(req.params.memberId);

    await requireProjectRole(projectId, authReq.user.id, ["admin"]);

    const { data: member, error: memberError } = await supabaseAdmin
      .from("project_members")
      .select("user_id, role")
      .eq("project_id", projectId)
      .eq("user_id", memberId)
      .maybeSingle();

    if (memberError) {
      throw memberError;
    }

    if (!member) {
      throw notFound("Member not found");
    }

    if (member.user_id === authReq.user.id) {
      throw forbidden("Admins cannot remove themselves");
    }

    if (member.role === "admin") {
      const { count, error: countError } = await supabaseAdmin
        .from("project_members")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("role", "admin");

      if (countError) {
        throw countError;
      }

      if (count === 1) {
        throw badRequest("A project must have at least one admin");
      }
    }

    const { error } = await supabaseAdmin
      .from("project_members")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", memberId);

    if (error) {
      throw error;
    }

    res.status(204).send();
  })
);
