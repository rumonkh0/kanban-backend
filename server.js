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
import clients from "./routes/clients.js";
import freelancers from "./routes/freelancers.js";
import projects from "./routes/projects.js";
import stages from "./routes/stages.js";
import tasks from "./routes/tasks.js";
import payments from "./routes/payments.js";
import teamPayments from "./routes/teamPayments.js";

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
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 mins
  max: 100,
});
app.use(limiter);

// Enable CORS
app.use(cors());

// Set static folder

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// Mount routers
app.use("/api/v1/clients", clients);
app.use("/api/v1/freelancers", freelancers);
app.use("/api/v1/projects", projects);
app.use("/api/v1/stages", stages);
app.use("/api/v1/tasks", tasks);
app.use("/api/v1/payments", payments);
app.use("/api/v1/team-payments", teamPayments);

app.get("/", (req, res) => {
  res.send("Hello From Creative CRM!");
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
