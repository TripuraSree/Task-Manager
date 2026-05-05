import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { requireAuth } from "./middleware/auth";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { dashboardRouter } from "./routes/dashboard";
import { meRouter } from "./routes/me";
import { projectRouter } from "./routes/projects";
import { projectTasksRouter, taskRouter } from "./routes/tasks";

export const app = express();

const allowedOrigins = new Set([
  env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174"
]);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin) || env.NODE_ENV === "development") {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true
  })
);
app.use(express.json());
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/", (_req, res) => {
  res.json({
    name: "Task Management API",
    status: "running",
    health: "/health"
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/me", requireAuth, meRouter);
app.use("/api/projects", requireAuth, projectRouter);
app.use("/api/projects/:projectId/tasks", requireAuth, projectTasksRouter);
app.use("/api/tasks", requireAuth, taskRouter);
app.use("/api/dashboard", requireAuth, dashboardRouter);

app.use(notFoundHandler);
app.use(errorHandler);
