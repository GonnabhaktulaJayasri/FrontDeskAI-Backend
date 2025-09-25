import express from "express";
import { getAppointments } from "../controllers/appointment.js";

const router = express.Router();

router.get("/", getAppointments);

export default router;
