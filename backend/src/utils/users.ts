import { supabaseAdmin } from "../config/supabase";
import { notFound } from "./httpError";

export const resolveUserId = async (input: { userId?: string; email?: string }) => {
  if (input.userId) {
    return input.userId;
  }

  const email = input.email?.toLowerCase();
  if (!email) {
    throw notFound("User not found");
  }

  const { data, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
    throw error;
  }

  const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);

  if (!user) {
    throw notFound("No registered user found with that email");
  }

  return user.id;
};

export const getUserEmailsById = async (userIds: string[]) => {
  const uniqueIds = [...new Set(userIds)];
  const entries = await Promise.all(
    uniqueIds.map(async (userId) => {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      return [userId, error ? null : data.user?.email ?? null] as const;
    })
  );

  return new Map(entries);
};
