// Create routes/messages.js

import express from "express";
import {
    handleIncomingSMS,
    handleIncomingWhatsApp,
    handleMessageStatus,
    sendManualReminder,
    sendManualFollowUp,
    updateCommunicationPreferences,
    optInWhatsApp,
    optOutWhatsApp,
    getMessageHistory,
    getMessagingStats
} from "../controllers/messageController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Webhook endpoints (no auth required - these come from Twilio)
router.post("/webhook/sms", handleIncomingSMS);
router.post("/webhook/whatsapp", handleIncomingWhatsApp);
router.post("/webhook/status", handleMessageStatus);

// Manual message sending (requires auth)
router.post("/reminder", authMiddleware, sendManualReminder);
router.post("/followup", authMiddleware, sendManualFollowUp);

// Patient preferences management (requires auth)
router.patch("/preferences/:patientId", authMiddleware, updateCommunicationPreferences);
router.post("/whatsapp/opt-in", authMiddleware, optInWhatsApp);
router.post("/whatsapp/opt-out", authMiddleware, optOutWhatsApp);

// Message history and analytics (requires auth)
router.get("/history/:patientId", authMiddleware, getMessageHistory);
router.get("/stats", authMiddleware, getMessagingStats);

export default router;