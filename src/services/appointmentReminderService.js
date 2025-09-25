import cron from 'node-cron';
import Appointment from '../models/Appointment.js';
import callService from './callService.js';
import 'dotenv/config';

class AppointmentReminderService {
    constructor() {
        this.isRunning = false;
        this.cronJob = null;
        this.maxRetries = parseInt(process.env.REMINDER_MAX_RETRIES) || 3;
        this.retryIntervalMinutes = parseInt(process.env.REMINDER_RETRY_INTERVAL) || 30;
    }

    start() {
        if (this.isRunning) {
            console.log('Appointment reminder service is already running');
            return;
        }

        console.log('Starting appointment reminder service...');
        const interval = process.env.REMINDER_CHECK_INTERVAL || '*/10 * * * *'; // Every 10 minutes

        this.cronJob = cron.schedule(interval, async () => {
            await this.checkAndScheduleReminders();
        }, {
            scheduled: true,
            timezone: process.env.TIMEZONE || "America/New_York"
        });

        this.isRunning = true;
    }

    stop() {
        if (this.cronJob) {
            this.cronJob.destroy();
            this.cronJob = null;
            this.isRunning = false;
            console.log('Appointment reminder service stopped');
        }
    }

    async checkAndScheduleReminders() {
        try {
            console.log('Checking for appointment reminders...');

            const now = new Date();
            const oneDayFromNow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
            const oneHourFromNow = new Date(now.getTime() + (60 * 60 * 1000));

            // Process 24-hour reminders
            await this.processReminders(now, oneDayFromNow, '24_hour');

            // Process 1-hour reminders  
            await this.processReminders(now, oneHourFromNow, '1_hour');

            // Retry failed reminders
            await this.retryFailedReminders();

            console.log('Reminder check completed');
        } catch (error) {
            console.error('Error in reminder check:', error);
        }
    }

    async processReminders(startTime, endTime, reminderType) {
        try {
            // Find appointments needing reminders - adapted to your schema
            const appointments = await Appointment.find({
                dateTime: { $gte: startTime, $lte: endTime },
                status: { $in: ['confirmed', 'scheduled', 'rescheduled'] },
                'reminderPreferences.enabled': true,
                // Only appointments that haven't been sent this reminder type
                $or: [
                    { [`reminderCalls.${reminderType}.status`]: 'not_sent' },
                    { [`reminderCalls.${reminderType}.status`]: { $exists: false } },
                    { [`reminderCalls.${reminderType}`]: { $exists: false } }
                ]
            }).populate('patient doctor');

            console.log(`Found ${appointments.length} appointments needing ${reminderType} reminders`);

            for (const appointment of appointments) {
                if (appointment.patient?.phone) {
                    await this.triggerReminder(appointment, reminderType);
                } else {
                    console.log(`Skipping reminder for appointment ${appointment._id} - no patient phone`);
                    await this.updateReminderStatus(appointment._id, reminderType, 'failed');
                }
            }
        } catch (error) {
            console.error(`Error processing ${reminderType} reminders:`, error);
        }
    }

    async retryFailedReminders() {
        try {
            const now = new Date();
            const retryThreshold = new Date(now.getTime() - (this.retryIntervalMinutes * 60 * 1000));

            // Find failed reminders that are eligible for retry - adapted to your schema
            const appointments = await Appointment.find({
                $or: [
                    {
                        $and: [
                            { 'reminderCalls.24_hour.status': { $in: ['failed', 'no_answer'] } },
                            { 'reminderCalls.24_hour.attemptCount': { $lte: this.maxRetries } },
                            {
                                $or: [
                                    { 'reminderCalls.24_hour.status': 'failed' }, // retry immediately
                                    { 'reminderCalls.24_hour.lastAttempt': { $lte: retryThreshold } },
                                    { 'reminderCalls.24_hour.lastAttempt': { $exists: false } }
                                ]
                            }
                        ]
                    },
                    {
                        $and: [
                            { 'reminderCalls.1_hour.status': { $in: ['failed', 'no_answer'] } },
                            { 'reminderCalls.1_hour.attemptCount': { $lte: this.maxRetries } },
                            {
                                $or: [
                                    { 'reminderCalls.1_hour.status': 'failed' }, // retry immediately
                                    { 'reminderCalls.1_hour.lastAttempt': { $lte: retryThreshold } },
                                    { 'reminderCalls.1_hour.lastAttempt': { $exists: false } }
                                ]
                            }
                        ]
                    }
                ],
                status: { $in: ['confirmed', 'scheduled', 'rescheduled'] },
                'reminderPreferences.enabled': true,
                dateTime: { $gte: now }
            }).populate('patient doctor');
            
            console.log(`Found ${appointments.length} failed reminders to retry`);

            for (const appointment of appointments) {
                // Determine which reminder types need retry
                const reminderTypes = [];

                if (this.needsRetry(appointment.reminderCalls?.['24_hour'])) {
                    reminderTypes.push('24_hour');
                }

                if (this.needsRetry(appointment.reminderCalls?.['1_hour'])) {
                    reminderTypes.push('1_hour');
                }

                for (const reminderType of reminderTypes) {
                    if (appointment.patient?.phone) {
                        await this.triggerReminder(appointment, reminderType, true);
                    }
                }
            }
        } catch (error) {
            console.error('Error retrying failed reminders:', error);
        }
    }

    needsRetry(reminderCall) {
        return reminderCall &&
            ['failed', 'no_answer'].includes(reminderCall.status) &&
            (reminderCall.attemptCount || 1) <= this.maxRetries;
    }

    async triggerReminder(appointment, reminderType, isRetry = false) {
        try {
            const action = isRetry ? 'Retrying' : 'Triggering';
            console.log(`${action} ${reminderType} reminder for appointment ${appointment._id} (Patient: ${appointment.patient.name})`);

            // Update attempt tracking BEFORE making the call
            await this.updateReminderAttempt(appointment._id, reminderType, isRetry);

            // Convert reminder type for the service call
            const serviceReminderType = reminderType === '24_hour' ? '24h' : '1h';

            // Use the real call service
            const callResult = await callService.makeAppointmentReminderCall(
                appointment._id,
                serviceReminderType,
                appointment.hospitalId
            );

            // Update appointment with successful call initiation
            await Appointment.findByIdAndUpdate(appointment._id, {
                $set: {
                    [`reminderCalls.${reminderType}.sentAt`]: new Date(),
                    [`reminderCalls.${reminderType}.callSid`]: callResult.call.sid,
                    [`reminderCalls.${reminderType}.status`]: 'sent' // Will be updated by webhook
                }
            });

            console.log(`${reminderType} reminder initiated successfully for appointment ${appointment._id}, Call SID: ${callResult.call.sid}`);
            return { success: true, callSid: callResult.call.sid };

        } catch (error) {
            console.error(`Error triggering ${reminderType} reminder for appointment ${appointment._id}:`, error);

            // Mark as failed
            await this.updateReminderStatus(appointment._id, reminderType, 'failed');
            return { success: false, error: error.message };
        }
    }

    async updateReminderAttempt(appointmentId, reminderType, isRetry) {
        try {
            const now = new Date();

            if (isRetry) {
                // For retry, increment attempt count
                await Appointment.findByIdAndUpdate(appointmentId, {
                    $inc: {
                        [`reminderCalls.${reminderType}.attemptCount`]: 1
                    },
                    $set: {
                        [`reminderCalls.${reminderType}.status`]: 'sent',
                        [`reminderCalls.${reminderType}.lastAttempt`]: now
                    }
                });
            } else {
                // For first attempt, initialize if needed
                const appointment = await Appointment.findById(appointmentId);
                const currentAttemptCount = appointment.reminderCalls?.[reminderType]?.attemptCount || 1;

                await Appointment.findByIdAndUpdate(appointmentId, {
                    $set: {
                        [`reminderCalls.${reminderType}.status`]: 'sent',
                        [`reminderCalls.${reminderType}.attemptCount`]: currentAttemptCount,
                        [`reminderCalls.${reminderType}.lastAttempt`]: now
                    }
                });
            }
        } catch (error) {
            console.error(`Error updating reminder attempt for appointment ${appointmentId}:`, error);
        }
    }

    async updateReminderStatus(appointmentId, reminderType, status) {
        try {
            await Appointment.findByIdAndUpdate(appointmentId, {
                $set: {
                    [`reminderCalls.${reminderType}.status`]: status,
                    [`reminderCalls.${reminderType}.lastAttempt`]: new Date()
                }
            });
        } catch (error) {
            console.error(`Error updating reminder status for appointment ${appointmentId}:`, error);
        }
    }

    // Manual trigger method for testing
    async triggerManualReminder(appointmentId, reminderType) {
        try {
            const appointment = await Appointment.findById(appointmentId)
                .populate('patient doctor');

            if (!appointment) {
                throw new Error('Appointment not found');
            }

            if (!appointment.patient?.phone) {
                throw new Error('Patient phone number not available');
            }

            // Validate reminder type for your schema
            if (!['24_hour', '1_hour'].includes(reminderType)) {
                throw new Error('Invalid reminder type. Use 24_hour or 1_hour');
            }

            const result = await this.triggerReminder(appointment, reminderType);
            return result;

        } catch (error) {
            console.error('Manual reminder trigger error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get reminder statistics adapted to your schema
    async getReminderStats(dateRange = 7) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - dateRange);

            const stats = await Appointment.aggregate([
                {
                    $match: {
                        dateTime: { $gte: startDate },
                        $or: [
                            { 'reminderCalls.24_hour': { $exists: true } },
                            { 'reminderCalls.1_hour': { $exists: true } }
                        ]
                    }
                },
                {
                    $facet: {
                        '24_hour_stats': [
                            { $match: { 'reminderCalls.24_hour': { $exists: true } } },
                            {
                                $group: {
                                    _id: '$reminderCalls.24_hour.status',
                                    count: { $sum: 1 },
                                    averageAttempts: { $avg: '$reminderCalls.24_hour.attemptCount' }
                                }
                            }
                        ],
                        '1_hour_stats': [
                            { $match: { 'reminderCalls.1_hour': { $exists: true } } },
                            {
                                $group: {
                                    _id: '$reminderCalls.1_hour.status',
                                    count: { $sum: 1 },
                                    averageAttempts: { $avg: '$reminderCalls.1_hour.attemptCount' }
                                }
                            }
                        ]
                    }
                }
            ]);

            return {
                byType: {
                    '24_hour': stats[0]['24_hour_stats'],
                    '1_hour': stats[0]['1_hour_stats']
                },
                dateRange: dateRange
            };

        } catch (error) {
            console.error('Error getting reminder stats:', error);
            return { error: error.message };
        }
    }

    // Get current service status
    getStatus() {
        return {
            isRunning: this.isRunning,
            cronSchedule: process.env.REMINDER_CHECK_INTERVAL || '*/10 * * * *',
            maxRetries: this.maxRetries,
            retryIntervalMinutes: this.retryIntervalMinutes,
            timezone: process.env.TIMEZONE || "America/New_York",
            reminderTypes: ['24_hour', '1_hour']
        };
    }
}

// Create singleton instance
const appointmentReminderService = new AppointmentReminderService();
export default appointmentReminderService;