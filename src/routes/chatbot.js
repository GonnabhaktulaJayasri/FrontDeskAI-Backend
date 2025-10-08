
import express from 'express';
import {
    initializeChat,
    sendMessage,
    getConversationHistory
} from '../controllers/chatbotController.js';

const router = express.Router();

// Initialize new chat session
router.post('/initialize', initializeChat);

// Send message and get AI response
router.post('/message', sendMessage);

// Get conversation history
router.get('/conversation/:sessionId', getConversationHistory);

export default router;