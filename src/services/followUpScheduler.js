import cron from 'node-cron';
import Appointment from '../models/Appointment.js';
import callService from './callService.js';
import 'dotenv/config';

class FollowUpService {
    constructor() {
        this.isRunning = false;
        this.cronJob = null;
    }

    start() {
        if (this.isRunning) {
            console.log('Follow-up service is already running');
            return;
        }

        console.log('Starting follow-up call service...');
        const interval = process.env.FOLLOWUP_CHECK_INTERVAL || '*/15 * * * *'; // Every 15 minutes by default

        this.cronJob = cron.schedule(interval, async () => {
            await this.checkAndScheduleFollowUps();
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
            console.log('Follow-up call service stopped');
        }
    }

    async checkAndScheduleFollowUps() {
        try {
            console.log('Checking for follow-up calls...');

            // FIXED: Only process TODAY's follow-ups (for yesterday's appointments)
            await this.processTodaysFollowUps();

            // FIXED: Close expired follow-ups that weren't completed yesterday
            await this.closeExpiredFollowUps();

            console.log('Follow-up check completed');
        } catch (error) {
            console.error('Error in follow-up check:', error);
        }
    }

    async processTodaysFollowUps() {
        try {
            // FIXED: Find appointments from exactly yesterday that need follow-ups TODAY
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);

            const endOfYesterday = new Date(yesterday);
            endOfYesterday.setHours(23, 59, 59, 999);

            console.log(`Looking for appointments from ${yesterday.toLocaleDateString()} that need follow-up TODAY`);

            const appointments = await Appointment.find({
                // Appointment was exactly yesterday
                dateTime: { $gte: yesterday, $lte: endOfYesterday },
                status: { $in: ['confirmed', 'scheduled', 'rescheduled'] },
                // Follow-up not done yet or currently in progress
                $or: [
                    { 'followUpCall.status': 'not_scheduled' },
                    { 'followUpCall.status': { $exists: false } },
                    { 'followUpCall': { $exists: false } },
                    { 'followUpCall.status': 'scheduled' },
                    { 'followUpCall.status': 'in_progress' },
                    { 'followUpCall.status': 'sent' }, // Include sent calls that may need retry TODAY only
                    { 'followUpCall.status': 'no_answer' }, // Allow retry TODAY only
                    { 'followUpCall.status': 'busy' }, // Allow retry TODAY only  
                    { 'followUpCall.status': 'failed' } // Allow retry TODAY only
                ],
                // Follow-up enabled
                $and: [
                    {
                        $or: [
                            { 'followUpCall.enabled': true },
                            { 'followUpCall.enabled': { $exists: false } }
                        ]
                    }
                ]
            }).populate('patient doctor');

            console.log(`Found ${appointments.length} appointments from yesterday needing follow-up TODAY`);

            for (const appointment of appointments) {
                await this.processAppointmentFollowUp(appointment);
            }
        } catch (error) {
            console.error('Error processing today\'s follow-ups:', error);
        }
    }

    async processAppointmentFollowUp(appointment) {
        try {
            const currentStatus = appointment.followUpCall?.status || 'not_scheduled';
            const attemptCount = appointment.followUpCall?.attemptCount || 0;
            const maxAttempts = appointment.followUpCall?.maxAttempts || 3;

            console.log(`Processing follow-up for appointment ${appointment._id} - Status: ${currentStatus}, Attempts: ${attemptCount}/${maxAttempts}`);

            // Check if patient has phone
            if (!appointment.patient?.phone) {
                console.log(`Skipping appointment ${appointment._id} - no patient phone number`);
                await this.updateFollowUpStatus(appointment._id, 'failed', 'No patient phone number');
                return;
            }

            // FIXED: Check if we've reached max attempts for TODAY
            if (attemptCount >= maxAttempts) {
                console.log(`Max attempts reached for appointment ${appointment._id} - marking as completed`);
                await this.updateFollowUpStatus(appointment._id, 'completed', 'Max attempts reached for the day');
                return;
            }

            // FIXED: Handle different statuses
            switch (currentStatus) {
                case 'not_scheduled':
                    await this.scheduleAndTriggerFollowUp(appointment);
                    break;

                case 'scheduled':
                    await this.triggerFollowUpCall(appointment);
                    break;

                case 'in_progress':
                case 'sent':
                    // FIXED: Check if call has been stuck for more than 10 minutes
                    const lastAttempt = appointment.followUpCall?.lastAttempt || appointment.followUpCall?.sentAt;
                    if (lastAttempt) {
                        const timeSinceLastAttempt = Date.now() - lastAttempt.getTime();
                        if (timeSinceLastAttempt > 10 * 60 * 1000) { // 10 minutes
                            console.log(`Call stuck for appointment ${appointment._id}, retrying...`);
                            await this.triggerFollowUpCall(appointment);
                        } else {
                            console.log(`Call in progress for appointment ${appointment._id}, waiting...`);
                        }
                    } else {
                        // No timestamp, retry immediately
                        await this.triggerFollowUpCall(appointment);
                    }
                    break;

                case 'no_answer':
                case 'busy':
                case 'failed':
                    // FIXED: Only retry if there's time left in the day and attempts remaining
                    const now = new Date();
                    const endOfDay = new Date();
                    endOfDay.setHours(17, 0, 0, 0); // Stop trying after 5 PM

                    if (now < endOfDay && attemptCount < maxAttempts) {
                        const lastAttemptTime = appointment.followUpCall?.lastAttempt;
                        if (!lastAttemptTime || (Date.now() - lastAttemptTime.getTime()) > 60 * 60 * 1000) { // 1 hour gap
                            console.log(`Retrying failed follow-up for appointment ${appointment._id}`);
                            await this.triggerFollowUpCall(appointment);
                        } else {
                            console.log(`Too soon to retry appointment ${appointment._id}, waiting...`);
                        }
                    } else {
                        console.log(`End of day reached or max attempts for appointment ${appointment._id} - marking as no_answer`);
                        await this.updateFollowUpStatus(appointment._id, 'no_answer', 'Follow-up window ended - no answer after all attempts');
                    }
                    break;

                case 'answered':
                case 'completed':
                    // Already completed, skip
                    console.log(`Follow-up already completed for appointment ${appointment._id}`);
                    break;

                default:
                    console.log(`Unknown status ${currentStatus} for appointment ${appointment._id}`);
                    break;
            }
        } catch (error) {
            console.error(`Error processing follow-up for appointment ${appointment._id}:`, error);
        }
    }

    async scheduleAndTriggerFollowUp(appointment) {
        try {
            console.log(`Scheduling and triggering follow-up for appointment ${appointment._id}`);

            // Schedule for today (since appointment was yesterday)
            const today = new Date();
            today.setHours(10, 0, 0, 0); // Default to 10 AM, but trigger immediately if past 10 AM

            const updateObj = {
                $set: {
                    'followUpCall.scheduledDate': today,
                    'followUpCall.status': 'scheduled',
                    'followUpCall.enabled': true,
                    'followUpCall.attemptCount': 0,
                    'followUpCall.maxAttempts': 3,
                    'followUpCall.scheduledAt': new Date(),
                    'followUpCall.lastStatusUpdate': new Date()
                }
            };

            await Appointment.findByIdAndUpdate(appointment._id, updateObj);

            // Immediately trigger the call
            await this.triggerFollowUpCall(appointment);
        } catch (error) {
            console.error(`Error scheduling follow-up for appointment ${appointment._id}:`, error);
        }
    }

    async triggerFollowUpCall(appointment) {
        try {
            console.log(`Triggering follow-up call for appointment ${appointment._id} (Patient: ${appointment.patient.name})`);

            // Update attempt tracking BEFORE making the call
            await Appointment.findByIdAndUpdate(appointment._id, {
                $set: {
                    'followUpCall.status': 'in_progress',
                    'followUpCall.lastAttempt': new Date(),
                    'followUpCall.lastStatusUpdate': new Date()
                },
                $inc: {
                    'followUpCall.attemptCount': 1
                }
            });

            // Use the call service directly
            const callResult = await callService.makeFollowUpCall({
                patientId: appointment.patient._id.toString(),
                appointmentId: appointment._id.toString(),
                followUpType: 'post_appointment',
                notes: `Follow-up call for appointment on ${appointment.dateTime.toLocaleDateString()} - Day after appointment`,
                hospitalId: appointment.hospitalId
            });

            // Update appointment with successful call initiation
            await Appointment.findByIdAndUpdate(appointment._id, {
                $set: {
                    'followUpCall.sentAt': new Date(),
                    'followUpCall.callSid': callResult.call.sid,
                    'followUpCall.status': 'sent', // Will be updated by webhook
                    'followUpCall.callRecordId': callResult.call.callRecordId,
                    'followUpCall.lastStatusUpdate': new Date()
                }
            });

            console.log(`Follow-up call initiated for appointment ${appointment._id}, Call SID: ${callResult.call.sid}`);

            return { success: true, callSid: callResult.call.sid };

        } catch (error) {
            console.error(`Error triggering follow-up call for appointment ${appointment._id}:`, error);

            // Mark as failed
            await this.updateFollowUpStatus(appointment._id, 'failed', error.message);
            return { success: false, error: error.message };
        }
    }

    // FIXED: New method to close follow-ups that are past their day
    async closeExpiredFollowUps() {
        try {
            // Find appointments that are older than yesterday and still have pending follow-ups
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            twoDaysAgo.setHours(23, 59, 59, 999);

            const expiredFollowUps = await Appointment.find({
                dateTime: { $lte: twoDaysAgo }, // Appointment was 2+ days ago
                'followUpCall.status': {
                    $in: ['scheduled', 'in_progress', 'sent', 'no_answer', 'busy', 'failed']
                }
            });

            console.log(`Found ${expiredFollowUps.length} expired follow-ups to close`);

            for (const appointment of expiredFollowUps) {
                await this.updateFollowUpStatus(appointment._id, 'completed', 'Follow-up window expired - too late to call');
                console.log(`Closed expired follow-up for appointment ${appointment._id}`);
            }
        } catch (error) {
            console.error('Error closing expired follow-ups:', error);
        }
    }

    async updateFollowUpStatus(appointmentId, status, errorMessage = null) {
        try {
            const updateObj = {
                $set: {
                    'followUpCall.status': status,
                    'followUpCall.lastStatusUpdate': new Date()
                }
            };

            if (errorMessage) {
                updateObj.$set['followUpCall.errorMessage'] = errorMessage;
            }

            console.log(`Updating follow-up status for appointment ${appointmentId}: ${status} ${errorMessage ? `(${errorMessage})` : ''}`);

            await Appointment.findByIdAndUpdate(appointmentId, updateObj);
        } catch (error) {
            console.error(`Error updating follow-up status for appointment ${appointmentId}:`, error);
        }
    }

    // Manual trigger - FIXED to respect single day rule
    async triggerManualFollowUp(appointmentId, hospitalId = null) {
        try {
            const appointment = await Appointment.findById(appointmentId)
                .populate('patient doctor');

            if (!appointment) {
                throw new Error('Appointment not found');
            }

            if (!appointment.patient?.phone) {
                throw new Error('Patient phone number not available');
            }

            // FIXED: Check if appointment is eligible for follow-up (within the day after)
            const appointmentDate = new Date(appointment.dateTime);
            appointmentDate.setHours(0, 0, 0, 0);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const daysDiff = Math.floor((today - appointmentDate) / (24 * 60 * 60 * 1000));

            if (daysDiff !== 1) {
                throw new Error(`Follow-up can only be triggered the day after appointment. Appointment was ${daysDiff} day(s) ago.`);
            }

            // Reset status to allow manual trigger
            await Appointment.findByIdAndUpdate(appointmentId, {
                $set: {
                    'followUpCall.status': 'scheduled',
                    'followUpCall.scheduledDate': new Date(),
                    'followUpCall.lastStatusUpdate': new Date()
                }
            });

            const result = await this.triggerFollowUpCall(appointment);
            return result;

        } catch (error) {
            console.error('Manual follow-up trigger error:', error);
            return { success: false, error: error.message };
        }
    }

    // Enhanced statistics
    async getFollowUpStats(dateRange = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - dateRange);

            const stats = await Appointment.aggregate([
                {
                    $match: {
                        dateTime: { $gte: startDate },
                        'followUpCall': { $exists: true }
                    }
                },
                {
                    $group: {
                        _id: '$followUpCall.status',
                        count: { $sum: 1 },
                        averageAttempts: { $avg: '$followUpCall.attemptCount' },
                        lastStatusUpdate: { $max: '$followUpCall.lastStatusUpdate' }
                    }
                }
            ]);

            return {
                byStatus: stats.reduce((acc, stat) => {
                    acc[stat._id] = {
                        count: stat.count,
                        averageAttempts: Math.round(stat.averageAttempts * 100) / 100,
                        lastUpdate: stat.lastStatusUpdate
                    };
                    return acc;
                }, {}),
                dateRange: dateRange,
                note: 'Follow-ups are only attempted on the day after appointment'
            };

        } catch (error) {
            console.error('Error getting follow-up stats:', error);
            return { error: error.message };
        }
    }

    // Get today's follow-up queue
    async getTodaysQueue() {
        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);

            const endOfYesterday = new Date(yesterday);
            endOfYesterday.setHours(23, 59, 59, 999);

            const todaysQueue = await Appointment.find({
                dateTime: { $gte: yesterday, $lte: endOfYesterday },
                'followUpCall': { $exists: true }
            })
                .populate('patient', 'name phone')
                .populate('doctor', 'name')
                .sort({ 'followUpCall.lastStatusUpdate': -1 });

            return todaysQueue.map(apt => ({
                appointmentId: apt._id,
                patientName: apt.patient?.name,
                patientPhone: apt.patient?.phone,
                doctorName: apt.doctor?.name,
                appointmentDate: apt.dateTime.toLocaleDateString(),
                followUpStatus: apt.followUpCall?.status,
                attemptCount: apt.followUpCall?.attemptCount || 0,
                lastAttempt: apt.followUpCall?.lastAttempt,
                callSid: apt.followUpCall?.callSid
            }));
        } catch (error) {
            console.error('Error getting today\'s queue:', error);
            return [];
        }
    }

    // Get current service status
    getStatus() {
        return {
            isRunning: this.isRunning,
            cronSchedule: process.env.FOLLOWUP_CHECK_INTERVAL || '*/15 * * * *',
            timezone: process.env.TIMEZONE || "America/New_York",
            description: 'Follow-up calls are made ONLY on the day after appointment',
            policy: {
                timing: 'Day after appointment only',
                maxAttempts: 3,
                retryWindow: '10 AM - 5 PM on follow-up day',
                retryInterval: '1 hour between attempts'
            },
            nextRun: this.cronJob ? this.cronJob.nextDate() : null
        };
    }
}

// Create singleton instance
const followUpService = new FollowUpService();
export default followUpService;