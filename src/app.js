import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import planRoutes from "./routes/plans.js";
import callRoutes from "./routes/calls.js";
import followUpRoutes from './routes/followup.js';
import patientRoutes from "./routes/patients.js";
import doctorRoutes from "./routes/doctors.js";
import callLogRoutes from "./routes/callLogs.js";
import appointmentRoutes from "./routes/appointments.js"
import messageRoutes from "./routes/messages.js"

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json()); // parse application/json
app.use(express.urlencoded({ extended: true }));
// app.use('/api/messages/webhook', bodyParser.urlencoded({ extended: false }));

// DB connection
connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/calls", callRoutes);
app.use("/api/follow-ups", followUpRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/call-logs", callLogRoutes);
app.use("/api/messages", messageRoutes);

app.get("/", (req, res) => {
    res.send("API is running...");
});

export default app;
