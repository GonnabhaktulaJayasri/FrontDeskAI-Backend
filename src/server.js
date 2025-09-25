import http from "http";
import app from "./app.js";
import setupStream from "./routes/stream.js";
import appointmentReminderService from "./services/appointmentReminderService.js";
import 'dotenv/config';
import followUpService from "./services/followUpScheduler.js";

const server = http.createServer(app);

// Attach WebSocket for Twilio <-> OpenAI bridge
setupStream(server);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // Start appointment reminder service after server is ready
    appointmentReminderService.start();

    if (process.env.AUTO_START_FOLLOWUP_SERVICE !== 'false') {
        console.log('Auto-starting follow-up service...');
        followUpService.start();
    } 
});

// Graceful shutdown handling
process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    appointmentReminderService.stop();
    followUpService.stop();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    appointmentReminderService.stop();
    followUpService.stop();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});