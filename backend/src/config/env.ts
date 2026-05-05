import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  FRONTEND_URL: z.string().trim().url().default("http://localhost:5173"),
  SUPABASE_URL: z
    .string()
    .trim()
    .url()
    .refine((value) => value.startsWith("http://") || value.startsWith("https://"), {
      message: "SUPABASE_URL must start with http:// or https://"
    }),
  SUPABASE_ANON_KEY: z.string().trim().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1)
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const invalidValues = parsedEnv.error.issues
    .map((issue) => {
      const field = issue.path.join(".");
      return field ? `${field} (${issue.message})` : issue.message;
    })
    .filter(Boolean)
    .join(", ");

  throw new Error(
    `Invalid backend environment variables: ${invalidValues}. ` +
      "Create backend/.env from backend/.env.example and add your Supabase project values."
  );
}

export const env = parsedEnv.data;
