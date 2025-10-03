import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";

import errorHandler from "./middleware/error.js";
import connectDB from "./config/db.js";

// Load env vars
dotenv.config({ path: "./config/config.env" });

// Connect to database
connectDB();

// Route files
import auth from "./routes/auth.js";
import clients from "./routes/clients.js";
import freelancers from "./routes/freelancers.js";
import projects from "./routes/projects.js";
import stages from "./routes/stages.js";
import tasks from "./routes/tasks.js";
import payments from "./routes/payments.js";
import teamPayments from "./routes/teamPayments.js";
import trackers from "./routes/trackers.js";
import services from "./routes/services.js";
import designations from "./routes/designations.js";
import departments from "./routes/departments.js";
import appreciations from "./routes/appreciations.js";
import notes from "./routes/notes.js";
import projectMembers from "./routes/projectMembers.js";
import comments from "./routes/comments.js";
import dashboard from "./routes/dashboard.js";
import files from "./routes/files.js";
import projectActivity from "./routes/projectActivity.js";

const app = express();

// Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// Dev logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// File uploading

// Set security headers
app.use(helmet());

// Rate limiting
// const limiter = rateLimit({
//   windowMs: 10 * 60 * 1000, // 10 mins
//   max: 1000,
// });
// app.use(limiter);

// Enable CORS
const allowedOrigins = [
  "https://kanban-eight-sigma.vercel.app",
  "http://localhost:5173", // local dev
  "http://192.168.1.7:5173", // local dev
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin); // allow this origin
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Set static folder

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(
  express.static(path.join(__dirname, "public"), {
    setHeaders: (res, filePath) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

// Mount routers
app.use("/api/v1/auth", auth);
app.use("/api/v1/dashboard", dashboard);
app.use("/api/v1/clients", clients);
app.use("/api/v1/freelancers", freelancers);
app.use("/api/v1/projects", projects);
app.use("/api/v1/stages", stages);
app.use("/api/v1/tasks", tasks);
app.use("/api/v1/payments", payments);
app.use("/api/v1/team-payments", teamPayments);
app.use("/api/v1/trackers", trackers);
app.use("/api/v1/services", services);
app.use("/api/v1/designations", designations);
app.use("/api/v1/departments", departments);
app.use("/api/v1/appreciations", appreciations);
app.use("/api/v1/notes", notes);
app.use("/api/v1/projectmembers", projectMembers);
app.use("/api/v1/comments", comments);
app.use("/api/v1/files", files);
app.use("/api/v1/projectactivity", projectActivity);

app.get("/api/v1/", (req, res) => {
  res.send("Hello From Creative CRM backend!");
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(
  PORT,
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  // server.close(() => process.exit(1));
});
