import express from "express";
import { getCallLogs } from "../controllers/callLog.js";

const router = express.Router();

router.get("/", getCallLogs);

export default router;
