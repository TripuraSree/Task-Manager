import type { NextFunction, Request, Response } from "express";
import { supabaseAnon } from "../config/supabase";
import type { AuthRequest } from "../types";
import { unauthorized } from "../utils/httpError";

export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    if (!token) {
      throw unauthorized();
    }

    const { data, error } = await supabaseAnon.auth.getUser(token);

    if (error || !data.user) {
      throw unauthorized("Invalid or expired token");
    }

    (req as AuthRequest).user = {
      id: data.user.id,
      email: data.user.email
    };

    next();
  } catch (error) {
    next(error);
  }
};
