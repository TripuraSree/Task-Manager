import { Router } from "express";
import { supabaseAdmin } from "../config/supabase";
import type { AuthRequest } from "../types";
import { asyncHandler } from "../utils/asyncHandler";

export const meRouter = Router();

meRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const authReq = req as AuthRequest;

    const { data: memberships, error } = await supabaseAdmin
      .from("project_members")
      .select("project_id, role, projects(id, name, description, created_at)")
      .eq("user_id", authReq.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      user: authReq.user,
      memberships
    });
  })
);
