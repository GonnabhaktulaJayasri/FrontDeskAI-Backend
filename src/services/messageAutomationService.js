// import cron from 'node-cron';
// import Appointment from '../models/Appointment.js';
// import Message from '../models/Message.js';
// import messageService from './messageService.js';
// import callService from './callService.js';
// import 'dotenv/config';

// class MessageAutomationService {
//     constructor() {
//         this.isRunning = false;
//         this.cronJobs = new Map();
//         this.maxRetries = parseInt(process.env.REMINDER_MAX_RETRIES) || 3;
//         this.retryIntervalMinutes = parseInt(process.env.REMINDER_RETRY_INTERVAL) || 30;
//     }

//     start() {
//         if (this.isRunning) {
//             console.log('Automated communication service is already running');
//             return;
//         }

//         console.log('Starting automation service...');

//         // Check for reminders every 10 minutes
//         const reminderInterval = process.env.REMINDER_CHECK_INTERVAL || '*/10 * * * *';
//         this.cronJobs.set('reminders', cron.schedule(reminderInterval, async () => {
//             await this.checkAndSendReminders();
//         }, { scheduled: true, timezone: process.env.TIMEZONE || "America/New_York" }));

//         // Check for follow-ups every 15 minutes
//         const followUpInterval = process.env.FOLLOWUP_CHECK_INTERVAL || '*/15 * * * *';
//         this.cronJobs.set('followups', cron.schedule(followUpInterval, async () => {
//             await this.checkAndSendFollowUps();
//         }, { scheduled: true, timezone: process.env.TIMEZONE || "America/New_York" }));

//         // Monitor message conversations and handle escalations
//         const monitoringInterval = '*/5 * * * *';
//         this.cronJobs.set('monitoring', cron.schedule(monitoringInterval, async () => {
//             await this.monitorConversations();
//         }, { scheduled: true, timezone: process.env.TIMEZONE || "America/New_York" }));

//         // Clean up old conversations
//         const cleanupInterval = '0 2 * * *';
//         this.cronJobs.set('cleanup', cron.schedule(cleanupInterval, async () => {
//             await this.cleanupOldConversations();
//         }, { scheduled: true, timezone: process.env.TIMEZONE || "America/New_York" }));

//         // Retry failed communications
//         const retryInterval = '*/30 * * * *';
//         this.cronJobs.set('retry', cron.schedule(retryInterval, async () => {
//             await this.retryFailedCommunications();
//         }, { scheduled: true, timezone: process.env.TIMEZONE || "America/New_York" }));

//         this.isRunning = true;
//     }

//     stop() {
//         if (!this.isRunning) return;

//         console.log('Stopping unified communication service...');

//         for (const [name, job] of this.cronJobs.entries()) {
//             job.destroy();
//         }

//         this.cronJobs.clear();
//         this.isRunning = false;
//         console.log('Unified communication service stopped');
//     }

//     /**
//      * UPDATED: Check and send appointment reminders using new schema
//      */
//     async checkAndSendReminders() {
//         try {
//             console.log('Checking for appointment reminders...');

//             const now = new Date();
//             const oneDayFromNow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
//             const oneHourFromNow = new Date(now.getTime() + (60 * 60 * 1000));

//             // Process 24-hour reminders
//             await this.processReminders(now, oneDayFromNow, '24_hour');

//             // Process 1-hour reminders  
//             await this.processReminders(now, oneHourFromNow, '1_hour');

//             console.log('Reminder check completed');
//         } catch (error) {
//             console.error('Error in reminder check:', error);
//         }
//     }

//     /**
//      * UPDATED: Process reminders using new unified schema
//      */
//     async processReminders(startTime, endTime, reminderType) {
//         try {
//             // Find appointments needing reminders using NEW schema
//             const appointments = await Appointment.find({
//                 dateTime: {
//                     $gte: startTime,
//                     $lte: endTime
//                 },
//                 status: { $in: ['scheduled', 'confirmed'] },
//                 [`reminders.${reminderType}.enabled`]: true,
//                 [`reminders.${reminderType}.status`]: 'not_sent',
//                 [`reminders.${reminderType}.attemptCount`]: { $lt: this.maxRetries }
//             }).populate('patient doctor');

//             console.log(`Found ${appointments.length} appointments for ${reminderType} reminders`);

//             for (const appointment of appointments) {
//                 if (!appointment.patient?.phone) {
//                     console.log(`Skipping appointment ${appointment._id} - no patient phone`);
//                     continue;
//                 }

//                 // Determine communication method using NEW schema
//                 const method = this.determineReminderMethod(appointment, reminderType);
                
//                 console.log(`Processing ${reminderType} reminder for appointment ${appointment._id} via ${method}`);

//                 if (method === 'call') {
//                     await this.triggerReminderCall(appointment, reminderType);
//                 } else {
//                     await this.triggerReminderMessage(appointment, reminderType, method);
//                 }

//                 // Brief delay to prevent overwhelming Twilio
//                 await new Promise(resolve => setTimeout(resolve, 1000));
//             }
//         } catch (error) {
//             console.error(`Error processing ${reminderType} reminders:`, error);
//         }
//     }

//     /**
//      * NEW: Determine reminder method using unified schema
//      */
//     determineReminderMethod(appointment, reminderType) {
//         // Check appointment-specific preference first
//         const appointmentMethod = appointment.reminders[reminderType]?.method;
//         if (appointmentMethod && appointmentMethod !== 'auto') {
//             return appointmentMethod;
//         }

//         // Check global reminder preferences
//         const globalPreference = appointment.reminderPreferences?.preferredMethod;
//         if (globalPreference && globalPreference !== 'auto') {
//             if (globalPreference === 'both_messages') {
//                 // Choose WhatsApp if available, otherwise SMS
//                 return appointment.patient.communicationPreferences?.allowWhatsApp ? 'whatsapp' : 'sms';
//             }
//             return globalPreference;
//         }

//         // Fall back to patient communication preferences
//         return this.chooseCommincationMethod(appointment.patient);
//     }

//     /**
//      * UPDATED: Choose communication method based on patient preferences
//      */
//     chooseCommincationMethod(patient) {
//         const prefs = patient.communicationPreferences || {};
        
//         // Check patient's overall preference
//         switch (prefs.preferredMethod) {
//             case 'whatsapp':
//                 return prefs.allowWhatsApp && patient.whatsappOptIn?.status ? 'whatsapp' : 'sms';
//             case 'sms':
//                 return prefs.allowSMS ? 'sms' : 'call';
//             case 'both_messages':
//                 if (prefs.allowWhatsApp && patient.whatsappOptIn?.status) {
//                     return 'whatsapp';
//                 } else if (prefs.allowSMS) {
//                     return 'sms';
//                 } else {
//                     return 'call';
//                 }
//             case 'call':
//             default:
//                 return 'call';
//         }
//     }

//     /**
//      * UPDATED: Trigger reminder call using new schema
//      */
//     async triggerReminderCall(appointment, reminderType) {
//         try {
//             console.log(`📞 Calling for ${reminderType} reminder: appointment ${appointment._id}`);

//             // Update attempt tracking using NEW schema
//             await this.updateReminderAttempt(appointment._id, reminderType, false);

//             // Convert reminder type for the service call
//             const serviceReminderType = reminderType === '24_hour' ? '24h' : '1h';

//             // Use the existing call service
//             const callResult = await callService.makeAppointmentReminderCall(
//                 appointment._id,
//                 serviceReminderType,
//                 appointment.hospitalId
//             );

//             // Update appointment using NEW schema fields
//             await Appointment.findByIdAndUpdate(appointment._id, {
//                 $set: {
//                     [`reminders.${reminderType}.sentAt`]: new Date(),
//                     [`reminders.${reminderType}.callSid`]: callResult.call.sid,
//                     [`reminders.${reminderType}.status`]: 'sent',
//                     [`reminders.${reminderType}.method`]: 'call'
//                 }
//             });

//             console.log(`Reminder call initiated for appointment ${appointment._id}`);

//         } catch (error) {
//             console.error(`Error with reminder call for appointment ${appointment._id}:`, error);
//             await this.updateReminderStatus(appointment._id, reminderType, 'failed');
//         }
//     }

//     /**
//      * UPDATED: Trigger reminder message using new schema
//      */
//     async triggerReminderMessage(appointment, reminderType, method) {
//         try {
//             console.log(`💬 Messaging (${method}) for ${reminderType} reminder: appointment ${appointment._id}`);

//             // Update attempt tracking using NEW schema
//             await this.updateReminderAttempt(appointment._id, reminderType, false);

//             // Check for existing conversation
//             const existingConversation = await Message.findOne({
//                 appointment: appointment._id,
//                 type: 'appointment_reminder',
//                 status: { $in: ['active', 'completed'] }
//             });

//             let result;
//             if (existingConversation) {
//                 console.log(`Existing conversation found for appointment ${appointment._id}`);
//                 result = { success: true, conversationId: existingConversation._id };
//             } else {
//                 // Start new message conversation
//                 result = await messageService.startMessageConversation(
//                     appointment._id,
//                     reminderType,
//                     method
//                 );
//             }

//             if (result.success) {
//                 // Update appointment using NEW schema
//                 await Appointment.findByIdAndUpdate(appointment._id, {
//                     $set: {
//                         [`reminders.${reminderType}.sentAt`]: new Date(),
//                         [`reminders.${reminderType}.messageSid`]: result.messageSid,
//                         [`reminders.${reminderType}.conversationId`]: result.conversationId,
//                         [`reminders.${reminderType}.status`]: 'sent',
//                         [`reminders.${reminderType}.method`]: method
//                     }
//                 });

//                 console.log(`Reminder message sent for appointment ${appointment._id}`);
//             } else {
//                 throw new Error(result.error || 'Failed to send message');
//             }

//         } catch (error) {
//             console.error(`Error with reminder message for appointment ${appointment._id}:`, error);
//             await this.updateReminderStatus(appointment._id, reminderType, 'failed');
//         }
//     }

//     /**
//      * UPDATED: Check and send follow-ups using new schema
//      */
//     async checkAndSendFollowUps() {
//         try {
//             console.log('Checking for follow-up communications...');
            
//             const now = new Date();
            
//             // Find appointments needing follow-ups
//             const appointments = await Appointment.find({
//                 $or: [
//                     // Case 1: Already scheduled follow-ups that are due
//                     {
//                         'followUp.status': 'scheduled',
//                         'followUp.scheduledDate': { $lte: now },
//                         'followUp.enabled': true,
//                         'followUp.attemptCount': { $lt: this.maxRetries }
//                     },
//                     // Case 2: Completed appointments needing auto-scheduling
//                     {
//                         status: 'completed',
//                         dateTime: { $lt: now }, // Past appointments
//                         'followUp.enabled': true,
//                         'followUp.status': 'not_scheduled'
//                     }
//                 ]
//             }).populate('patient doctor');
            
//             console.log(`Found ${appointments.length} appointments needing follow-ups`);
            
//             for (const appointment of appointments) {
//                 if (!appointment.patient?.phone) {
//                     console.log(`Skipping follow-up for appointment ${appointment._id} - no patient phone`);
//                     continue;
//                 }
                
//                 // Auto-schedule if status is 'not_scheduled'
//                 if (appointment.followUp.status === 'not_scheduled') {
//                     const appointmentDate = new Date(appointment.dateTime);
//                     const followUpDate = new Date(appointmentDate);
//                     followUpDate.setDate(followUpDate.getDate() + 1); // CHANGED: 1 day after appointment (was 7)
                    
//                     // Update the appointment
//                     appointment.followUp.status = 'scheduled';
//                     appointment.followUp.scheduledDate = followUpDate;
//                     appointment.followUp.attemptCount = 0;
//                     await appointment.save();
                    
//                     console.log(`Auto-scheduled follow-up for appointment ${appointment._id} on ${followUpDate.toISOString()}`);
                    
//                     // Check if follow-up is due now
//                     if (followUpDate > now) {
//                         console.log(`Follow-up scheduled for future date, skipping for now`);
//                         continue;
//                     }
//                 }
                
//                 // Determine communication method
//                 const method = this.determineFollowUpMethod(appointment);
//                 console.log(`Processing follow-up for appointment ${appointment._id} via ${method}`);
                
//                 // Send follow-up
//                 if (method === 'call') {
//                     await this.triggerFollowUpCall(appointment);
//                 } else {
//                     await this.triggerFollowUpMessage(appointment, method);
//                 }
                
//                 // Update follow-up status after sending
//                 await Appointment.findByIdAndUpdate(appointment._id, {
//                     'followUp.status': 'sent',
//                     'followUp.attemptCount': appointment.followUp.attemptCount + 1,
//                     'followUp.lastAttempt': new Date(),
//                     $inc: { 'communicationSummary.totalFollowUps': 1 }
//                 });
                
//                 // Brief delay between communications
//                 await new Promise(resolve => setTimeout(resolve, 1000));
//             }
            
//             console.log('Follow-up check completed');
//         } catch (error) {
//             console.error('Error checking follow-ups:', error);
//         }
//     }

//     /**
//      * NEW: Determine follow-up method using unified schema
//      */
//     determineFollowUpMethod(appointment) {
//         // Check follow-up specific method first
//         const followUpMethod = appointment.followUp?.method;
//         if (followUpMethod && followUpMethod !== 'auto') {
//             return followUpMethod;
//         }

//         // Fall back to patient communication preferences
//         return this.chooseCommincationMethod(appointment.patient);
//     }

//     /**
//      * UPDATED: Trigger follow-up call using new schema
//      */
//     async triggerFollowUpCall(appointment) {
//         try {
//             console.log(`📞 Calling for follow-up: appointment ${appointment._id}`);

//             // Update attempt tracking using NEW schema
//             await Appointment.findByIdAndUpdate(appointment._id, {
//                 $set: {
//                     'followUp.status': 'in_progress',
//                     'followUp.lastAttempt': new Date()
//                 },
//                 $inc: {
//                     'followUp.attemptCount': 1
//                 }
//             });

//             // Use the call service
//             const callResult = await callService.makeFollowUpCall({
//                 patientId: appointment.patient._id.toString(),
//                 appointmentId: appointment._id.toString(),
//                 followUpType: 'post_appointment',
//                 notes: `Follow-up call for appointment on ${appointment.dateTime.toLocaleDateString()}`,
//                 hospitalId: appointment.hospitalId
//             });

//             // Update appointment using NEW schema
//             await Appointment.findByIdAndUpdate(appointment._id, {
//                 $set: {
//                     'followUp.sentAt': new Date(),
//                     'followUp.callSid': callResult.call.sid,
//                     'followUp.status': 'sent',
//                     'followUp.method': 'call',
//                     'followUp.callRecordId': callResult.call.callRecordId
//                 }
//             });

//             console.log(`Follow-up call initiated for appointment ${appointment._id}`);

//         } catch (error) {
//             console.error(`Error with follow-up call for appointment ${appointment._id}:`, error);
//             await this.updateFollowUpStatus(appointment._id, 'failed', error.message);
//         }
//     }

//     /**
//      * UPDATED: Trigger follow-up message using new schema
//      */
//     async triggerFollowUpMessage(appointment, method) {
//         try {
//             console.log(`💬 Messaging (${method}) for follow-up: appointment ${appointment._id}`);

//             // Update attempt tracking using NEW schema
//             await Appointment.findByIdAndUpdate(appointment._id, {
//                 $set: {
//                     'followUp.status': 'in_progress',
//                     'followUp.lastAttempt': new Date()
//                 },
//                 $inc: {
//                     'followUp.attemptCount': 1
//                 }
//             });

//             // Check for existing conversation
//             const existingConversation = await Message.findOne({
//                 appointment: appointment._id,
//                 type: 'follow_up',
//                 status: { $in: ['active', 'completed'] }
//             });

//             let result;
//             if (existingConversation) {
//                 console.log(`Existing follow-up conversation found for appointment ${appointment._id}`);
//                 result = { success: true, conversationId: existingConversation._id };
//             } else {
//                 // Start new message conversation
//                 result = await messageService.startMessageConversation(
//                     appointment._id,
//                     'follow_up',
//                     method
//                 );
//             }

//             if (result.success) {
//                 // Update appointment using NEW schema
//                 await Appointment.findByIdAndUpdate(appointment._id, {
//                     $set: {
//                         'followUp.sentAt': new Date(),
//                         'followUp.messageSid': result.messageSid,
//                         'followUp.conversationId': result.conversationId,
//                         'followUp.status': 'sent_message',
//                         'followUp.method': method
//                     }
//                 });

//                 console.log(`Follow-up message sent for appointment ${appointment._id}`);
//             } else {
//                 throw new Error(result.error || 'Failed to send follow-up message');
//             }

//         } catch (error) {
//             console.error(`Error with follow-up message for appointment ${appointment._id}:`, error);
//             await this.updateFollowUpStatus(appointment._id, 'failed', error.message);
//         }
//     }

//     /**
//      * UPDATED: Monitor conversations and handle escalations
//      */
//     async monitorConversations() {
//         try {
//             // Find message conversations that need escalation using NEW schema
//             const escalationCandidates = await Appointment.find({
//                 'followUp.status': 'sent_message',
//                 'followUp.method': { $in: ['sms', 'whatsapp'] },
//                 'followUp.attemptCount': { $gte: 2 },
//                 'followUp.sentAt': { 
//                     $lte: new Date(Date.now() - (2 * 60 * 60 * 1000)) // 2 hours ago
//                 }
//             }).populate('patient');

//             for (const appointment of escalationCandidates) {
//                 console.log(`🔄 Escalating follow-up to call for appointment ${appointment._id}`);
                
//                 // Escalate to call using NEW schema
//                 await appointment.escalateFollowUp('no_response');
                
//                 // Trigger the call
//                 await this.triggerFollowUpCall(appointment);
//             }

//         } catch (error) {
//             console.error('Error monitoring conversations:', error);
//         }
//     }

//     /**
//      * UPDATED: Helper methods using new schema
//      */
//     async updateReminderAttempt(appointmentId, reminderType, isRetry) {
//         try {
//             const now = new Date();

//             if (isRetry) {
//                 await Appointment.findByIdAndUpdate(appointmentId, {
//                     $inc: { [`reminders.${reminderType}.attemptCount`]: 1 },
//                     $set: {
//                         [`reminders.${reminderType}.status`]: 'sent',
//                         [`reminders.${reminderType}.lastAttempt`]: now
//                     }
//                 });
//             } else {
//                 const appointment = await Appointment.findById(appointmentId);
//                 const currentAttemptCount = appointment.reminders?.[reminderType]?.attemptCount || 0;
                
//                 await Appointment.findByIdAndUpdate(appointmentId, {
//                     $set: {
//                         [`reminders.${reminderType}.status`]: 'sent',
//                         [`reminders.${reminderType}.attemptCount`]: currentAttemptCount + 1,
//                         [`reminders.${reminderType}.lastAttempt`]: now
//                     }
//                 });
//             }
//         } catch (error) {
//             console.error(`Error updating reminder attempt for appointment ${appointmentId}:`, error);
//         }
//     }

//     async updateReminderStatus(appointmentId, reminderType, status) {
//         try {
//             await Appointment.findByIdAndUpdate(appointmentId, {
//                 $set: {
//                     [`reminders.${reminderType}.status`]: status,
//                     [`reminders.${reminderType}.lastAttempt`]: new Date()
//                 }
//             });
//         } catch (error) {
//             console.error(`Error updating reminder status for appointment ${appointmentId}:`, error);
//         }
//     }

//     async updateFollowUpStatus(appointmentId, status, errorMessage = null) {
//         try {
//             const updateObj = {
//                 $set: {
//                     'followUp.status': status,
//                     'followUp.lastStatusUpdate': new Date()
//                 }
//             };

//             if (errorMessage) {
//                 updateObj.$set['followUp.errorMessage'] = errorMessage;
//             }

//             await Appointment.findByIdAndUpdate(appointmentId, updateObj);
//         } catch (error) {
//             console.error(`Error updating follow-up status for appointment ${appointmentId}:`, error);
//         }
//     }

//     /**
//      * UPDATED: Get statistics using new schema
//      */
//     async getUnifiedStats(dateRange = 7) {
//         try {
//             const startDate = new Date();
//             startDate.setDate(startDate.getDate() - dateRange);

//             const appointmentStats = await Appointment.aggregate([
//                 {
//                     $match: {
//                         createdAt: { $gte: startDate },
//                         $or: [
//                             { 'reminders.24_hour': { $exists: true } },
//                             { 'reminders.1_hour': { $exists: true } },
//                             { 'followUp': { $exists: true } }
//                         ]
//                     }
//                 },
//                 {
//                     $project: {
//                         _id: 1,
//                         reminderMethod24h: '$reminders.24_hour.method',
//                         reminderMethod1h: '$reminders.1_hour.method',
//                         followUpMethod: '$followUp.method',
//                         reminderStatus24h: '$reminders.24_hour.status',
//                         reminderStatus1h: '$reminders.1_hour.status',
//                         followUpStatus: '$followUp.status'
//                     }
//                 }
//             ]);

//             // Get message conversation stats
//             const messageStats = await Message.getConversationStats(dateRange);

//             return {
//                 dateRange: dateRange,
//                 appointments: {
//                     total: appointmentStats.length,
//                     withReminders: appointmentStats.filter(a => a.reminderMethod24h || a.reminderMethod1h).length,
//                     withFollowUps: appointmentStats.filter(a => a.followUpMethod).length
//                 },
//                 communicationMethods: this.calculateMethodBreakdown(appointmentStats),
//                 Messages: messageStats,
//                 note: 'This service handles both calls and messages based on patient preferences'
//             };

//         } catch (error) {
//             console.error('Error getting unified stats:', error);
//             return { error: error.message };
//         }
//     }

//     calculateMethodBreakdown(appointmentStats) {
//         const breakdown = {
//             call: 0,
//             sms: 0,
//             whatsapp: 0,
//             mixed: 0
//         };

//         appointmentStats.forEach(apt => {
//             const methods = new Set();

//             if (apt.reminderMethod24h) methods.add(apt.reminderMethod24h);
//             if (apt.reminderMethod1h) methods.add(apt.reminderMethod1h);
//             if (apt.followUpMethod) methods.add(apt.followUpMethod);

//             if (methods.has('call') && methods.size === 1) {
//                 breakdown.call++;
//             } else if (methods.has('sms') && methods.size === 1) {
//                 breakdown.sms++;
//             } else if (methods.has('whatsapp') && methods.size === 1) {
//                 breakdown.whatsapp++;
//             } else if (methods.size > 1) {
//                 breakdown.mixed++;
//             }
//         });

//         return breakdown;
//     }

//     /**
//      * UPDATED: Retry failed communications using new schema
//      */
//     async retryFailedCommunications() {
//         try {
//             console.log('Retrying failed communications...');

//             // Find appointments with failed reminders using NEW schema
//             const failedAppointments = await Appointment.find({
//                 $or: [
//                     { 
//                         'reminders.24_hour.status': { $in: ['failed', 'no_answer'] },
//                         'reminders.24_hour.attemptCount': { $lt: this.maxRetries }
//                     },
//                     { 
//                         'reminders.1_hour.status': { $in: ['failed', 'no_answer'] },
//                         'reminders.1_hour.attemptCount': { $lt: this.maxRetries }
//                     },
//                     { 
//                         'followUp.status': { $in: ['failed', 'no_answer'] },
//                         'followUp.attemptCount': { $lt: this.maxRetries }
//                     }
//                 ]
//             }).populate('patient');

//             for (const appointment of failedAppointments) {
//                 // Retry 24-hour reminder if needed
//                 if (this.needsRetry(appointment.reminders?.['24_hour'])) {
//                     await this.retryReminder(appointment, '24_hour');
//                 }

//                 // Retry 1-hour reminder if needed
//                 if (this.needsRetry(appointment.reminders?.['1_hour'])) {
//                     await this.retryReminder(appointment, '1_hour');
//                 }

//                 // Retry follow-up if needed
//                 if (this.needsRetry(appointment.followUp)) {
//                     await this.retryFollowUp(appointment);
//                 }
//             }
//         } catch (error) {
//             console.error('Error retrying failed communications:', error);
//         }
//     }

//     async retryReminder(appointment, reminderType) {
//         const communicationMethod = this.determineReminderMethod(appointment, reminderType);

//         if (communicationMethod === 'call') {
//             await this.triggerReminderCall(appointment, reminderType);
//         } else {
//             await this.triggerReminderMessage(appointment, reminderType, communicationMethod);
//         }
//     }

//     async retryFollowUp(appointment) {
//         const communicationMethod = this.determineFollowUpMethod(appointment);

//         if (communicationMethod === 'call') {
//             await this.triggerFollowUpCall(appointment);
//         } else {
//             await this.triggerFollowUpMessage(appointment, communicationMethod);
//         }
//     }

//     needsRetry(communicationRecord) {
//         return communicationRecord &&
//             ['failed', 'no_answer'].includes(communicationRecord.status) &&
//             (communicationRecord.attemptCount || 1) <= this.maxRetries;
//     }

//     async cleanupOldConversations() {
//         try {
//             const cutoffDate = new Date();
//             cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days old

//             const result = await Message.deleteMany({
//                 status: { $in: ['completed', 'expired'] },
//                 lastMessageAt: { $lt: cutoffDate }
//             });

//             console.log(`🧹 Cleaned up ${result.deletedCount} old conversations`);
//         } catch (error) {
//             console.error('Error cleaning up conversations:', error);
//         }
//     }
// }

// const messageAutomationService = new MessageAutomationService();
// export default messageAutomationService;


import cron from 'node-cron';
import Appointment from '../models/Appointment.js';
import messageService from './messageService.js';
import callService from './callService.js';
import fhirSearchService from './fhirSearchService.js';
import 'dotenv/config';

/**
 * Message Automation Service - EMR/FHIR First Approach
 * Always fetches latest patient data from EMR before sending communications
 */
class MessageAutomationService {
    constructor() {
        this.isRunning = false;
        this.cronJobs = new Map();
        this.maxRetries = parseInt(process.env.REMINDER_MAX_RETRIES) || 3;
        this.retryIntervalMinutes = parseInt(process.env.REMINDER_RETRY_INTERVAL) || 30;
    }

    start() {
        if (this.isRunning) {
            console.log('Automated communication service is already running');
            return;
        }

        console.log('Starting automation service (EMR-first approach)...');

        // Check for reminders every 10 minutes
        const reminderInterval = process.env.REMINDER_CHECK_INTERVAL || '*/10 * * * *';
        this.cronJobs.set('reminders', cron.schedule(reminderInterval, async () => {
            await this.checkAndSendReminders();
        }, { scheduled: true, timezone: process.env.TIMEZONE || "America/New_York" }));

        // Check for follow-ups every 15 minutes
        const followUpInterval = process.env.FOLLOWUP_CHECK_INTERVAL || '*/15 * * * *';
        this.cronJobs.set('followups', cron.schedule(followUpInterval, async () => {
            await this.checkAndSendFollowUps();
        }, { scheduled: true, timezone: process.env.TIMEZONE || "America/New_York" }));

        // Monitor message conversations and handle escalations
        const monitoringInterval = '*/5 * * * *';
        this.cronJobs.set('monitoring', cron.schedule(monitoringInterval, async () => {
            await this.monitorConversations();
        }, { scheduled: true, timezone: process.env.TIMEZONE || "America/New_York" }));

        // Retry failed communications
        const retryInterval = '*/30 * * * *';
        this.cronJobs.set('retry', cron.schedule(retryInterval, async () => {
            await this.retryFailedCommunications();
        }, { scheduled: true, timezone: process.env.TIMEZONE || "America/New_York" }));

        this.isRunning = true;
    }

    stop() {
        if (!this.isRunning) return;

        console.log('Stopping communication service...');

        for (const [name, job] of this.cronJobs.entries()) {
            job.destroy();
        }

        this.cronJobs.clear();
        this.isRunning = false;
        console.log('Communication service stopped');
    }

    /**
     * Check and send appointment reminders
     * ✅ Always fetches fresh patient data from EMR
     */
    async checkAndSendReminders() {
        try {
            console.log('Checking for appointment reminders...');

            const now = new Date();
            const oneDayFromNow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
            const oneHourFromNow = new Date(now.getTime() + (60 * 60 * 1000));

            // Process 24-hour reminders
            await this.processReminders(now, oneDayFromNow, '24_hour');

            // Process 1-hour reminders  
            await this.processReminders(now, oneHourFromNow, '1_hour');

            console.log('Reminder check completed');
        } catch (error) {
            console.error('Error in reminder check:', error);
        }
    }

    /**
     * Process reminders with EMR data refresh
     */
    async processReminders(startTime, endTime, reminderType) {
        try {
            // Find appointments needing reminders
            const appointments = await Appointment.find({
                dateTime: {
                    $gte: startTime,
                    $lte: endTime
                },
                status: { $in: ['scheduled', 'confirmed'] },
                [`reminders.${reminderType}.enabled`]: true,
                [`reminders.${reminderType}.status`]: 'not_sent',
                [`reminders.${reminderType}.attemptCount`]: { $lt: this.maxRetries }
            }).populate('doctor patient');

            console.log(`Found ${appointments.length} appointments for ${reminderType} reminders`);

            for (const appointment of appointments) {
                try {
                    // ✅ STEP 1: Get fresh patient data from EMR/FHIR
                    console.log(`📡 Fetching patient from EMR for appointment ${appointment._id}`);
                    
                    const patientResult = await fhirSearchService.findOrImportPatientByPhone(
                        appointment.patient.phone || appointment.patientPhone
                    );

                    if (!patientResult.success || !patientResult.patient) {
                        console.log(`❌ Could not fetch patient from EMR for appointment ${appointment._id}`);
                        continue;
                    }

                    const emrPatient = patientResult.patient;
                    
                    if (!emrPatient.phone) {
                        console.log(`Skipping appointment ${appointment._id} - no patient phone in EMR`);
                        continue;
                    }

                    console.log(`✅ Using EMR data for patient ${emrPatient._id} (source: ${patientResult.source})`);

                    // ✅ STEP 2: Determine communication method using EMR patient preferences
                    const method = this.determineReminderMethod(appointment, reminderType, emrPatient);
                    
                    console.log(`Processing ${reminderType} reminder for appointment ${appointment._id} via ${method}`);

                    // ✅ STEP 3: Send communication using EMR patient data
                    if (method === 'call') {
                        await this.triggerReminderCall(appointment, reminderType, emrPatient);
                    } else {
                        await this.triggerReminderMessage(appointment, reminderType, method, emrPatient);
                    }

                    // Brief delay to prevent overwhelming Twilio
                    await new Promise(resolve => setTimeout(resolve, 1000));

                } catch (error) {
                    console.error(`Error processing reminder for appointment ${appointment._id}:`, error);
                    continue;
                }
            }
        } catch (error) {
            console.error(`Error processing ${reminderType} reminders:`, error);
        }
    }

    /**
     * Determine reminder method using EMR patient data
     */
    determineReminderMethod(appointment, reminderType, emrPatient) {
        // Check appointment-specific preference first
        const appointmentMethod = appointment.reminders[reminderType]?.method;
        if (appointmentMethod && appointmentMethod !== 'auto') {
            return appointmentMethod;
        }

        // Check global reminder preferences
        const globalPreference = appointment.reminderPreferences?.preferredMethod;
        if (globalPreference && globalPreference !== 'auto') {
            if (globalPreference === 'both_messages') {
                return emrPatient.communicationPreferences?.allowWhatsApp ? 'whatsapp' : 'sms';
            }
            return globalPreference;
        }

        // Use EMR patient communication preferences
        return this.chooseCommincationMethod(emrPatient);
    }

    /**
     * Choose communication method based on EMR patient preferences
     */
    chooseCommincationMethod(emrPatient) {
        const prefs = emrPatient.communicationPreferences || {};
        
        switch (prefs.preferredMethod) {
            case 'whatsapp':
                return prefs.allowWhatsApp && emrPatient.whatsappOptIn?.status ? 'whatsapp' : 'sms';
            case 'sms':
                return prefs.allowSMS ? 'sms' : 'call';
            case 'both_messages':
                if (prefs.allowWhatsApp && emrPatient.whatsappOptIn?.status) {
                    return 'whatsapp';
                } else if (prefs.allowSMS) {
                    return 'sms';
                } else {
                    return 'call';
                }
            case 'call':
            default:
                return 'call';
        }
    }

    /**
     * Trigger reminder call using EMR patient data
     */
    async triggerReminderCall(appointment, reminderType, emrPatient) {
        try {
            console.log(`📞 Calling ${emrPatient.phone} for ${reminderType} reminder: appointment ${appointment._id}`);

            // Update attempt tracking
            await this.updateReminderAttempt(appointment._id, reminderType, false);

            // Convert reminder type for the service call
            const serviceReminderType = reminderType === '24_hour' ? '24h' : '1h';

            // Use the existing call service with EMR patient data
            const callResult = await callService.makeAppointmentReminderCall(
                appointment._id,
                serviceReminderType,
                appointment.hospitalId
            );

            // Update appointment
            await Appointment.findByIdAndUpdate(appointment._id, {
                $set: {
                    [`reminders.${reminderType}.sentAt`]: new Date(),
                    [`reminders.${reminderType}.callSid`]: callResult.call.sid,
                    [`reminders.${reminderType}.status`]: 'sent',
                    [`reminders.${reminderType}.method`]: 'call',
                    [`reminders.${reminderType}.emrPatientId`]: emrPatient.fhirId || emrPatient._id
                }
            });

            console.log(`✅ Reminder call initiated for appointment ${appointment._id}`);

        } catch (error) {
            console.error(`Error with reminder call for appointment ${appointment._id}:`, error);
            await this.updateReminderStatus(appointment._id, reminderType, 'failed');
        }
    }

    /**
     * Trigger reminder message using EMR patient data
     */
    async triggerReminderMessage(appointment, reminderType, method, emrPatient) {
        try {
            console.log(`💬 Messaging ${emrPatient.phone} (${method}) for ${reminderType} reminder: appointment ${appointment._id}`);

            // Update attempt tracking
            await this.updateReminderAttempt(appointment._id, reminderType, false);

            // Start new message conversation with EMR patient data
            const result = await messageService.startMessageConversation(
                appointment._id,
                reminderType,
                method
            );

            if (result.success) {
                // Update appointment
                await Appointment.findByIdAndUpdate(appointment._id, {
                    $set: {
                        [`reminders.${reminderType}.sentAt`]: new Date(),
                        [`reminders.${reminderType}.messageSid`]: result.messageSid,
                        [`reminders.${reminderType}.conversationId`]: result.conversationId,
                        [`reminders.${reminderType}.status`]: 'sent',
                        [`reminders.${reminderType}.method`]: method,
                        [`reminders.${reminderType}.emrPatientId`]: emrPatient.fhirId || emrPatient._id
                    }
                });

                console.log(`✅ Reminder message sent for appointment ${appointment._id}`);
            } else {
                throw new Error(result.error || 'Failed to send message');
            }

        } catch (error) {
            console.error(`Error with reminder message for appointment ${appointment._id}:`, error);
            await this.updateReminderStatus(appointment._id, reminderType, 'failed');
        }
    }

    /**
     * Check and send follow-ups with EMR data refresh
     */
    async checkAndSendFollowUps() {
        try {
            console.log('Checking for follow-up communications...');
            
            const now = new Date();
            
            // Find appointments needing follow-ups
            const appointments = await Appointment.find({
                $or: [
                    {
                        'followUp.status': 'scheduled',
                        'followUp.scheduledDate': { $lte: now },
                        'followUp.enabled': true,
                        'followUp.attemptCount': { $lt: this.maxRetries }
                    },
                    {
                        status: 'completed',
                        dateTime: { $lt: now },
                        'followUp.enabled': true,
                        'followUp.status': 'not_scheduled'
                    }
                ]
            }).populate('doctor patient');
            
            console.log(`Found ${appointments.length} appointments needing follow-ups`);
            
            for (const appointment of appointments) {
                try {
                    // ✅ Get fresh patient data from EMR
                    console.log(`📡 Fetching patient from EMR for follow-up ${appointment._id}`);
                    
                    const patientResult = await fhirSearchService.findOrImportPatientByPhone(
                        appointment.patient.phone || appointment.patientPhone
                    );

                    if (!patientResult.success || !patientResult.patient) {
                        console.log(`❌ Could not fetch patient from EMR for appointment ${appointment._id}`);
                        continue;
                    }

                    const emrPatient = patientResult.patient;
                    
                    if (!emrPatient.phone) {
                        console.log(`Skipping follow-up for appointment ${appointment._id} - no phone in EMR`);
                        continue;
                    }

                    console.log(`✅ Using EMR data for patient ${emrPatient._id} (source: ${patientResult.source})`);
                    
                    // Auto-schedule if status is 'not_scheduled'
                    if (appointment.followUp.status === 'not_scheduled') {
                        const appointmentDate = new Date(appointment.dateTime);
                        const followUpDate = new Date(appointmentDate);
                        followUpDate.setDate(followUpDate.getDate() + 1);
                        
                        appointment.followUp.status = 'scheduled';
                        appointment.followUp.scheduledDate = followUpDate;
                        appointment.followUp.attemptCount = 0;
                        await appointment.save();
                        
                        console.log(`Auto-scheduled follow-up for appointment ${appointment._id} on ${followUpDate.toISOString()}`);
                        
                        if (followUpDate > now) {
                            console.log(`Follow-up scheduled for future date, skipping for now`);
                            continue;
                        }
                    }
                    
                    // Determine communication method using EMR patient preferences
                    const method = this.determineFollowUpMethod(appointment, emrPatient);
                    console.log(`Processing follow-up for appointment ${appointment._id} via ${method}`);
                    
                    // Send follow-up using EMR patient data
                    if (method === 'call') {
                        await this.triggerFollowUpCall(appointment, emrPatient);
                    } else {
                        await this.triggerFollowUpMessage(appointment, method, emrPatient);
                    }
                    
                    // Update follow-up status after sending
                    await Appointment.findByIdAndUpdate(appointment._id, {
                        'followUp.status': 'sent',
                        'followUp.attemptCount': appointment.followUp.attemptCount + 1,
                        'followUp.lastAttempt': new Date(),
                        'followUp.emrPatientId': emrPatient.fhirId || emrPatient._id,
                        $inc: { 'communicationSummary.totalFollowUps': 1 }
                    });
                    
                    await new Promise(resolve => setTimeout(resolve, 1000));

                } catch (error) {
                    console.error(`Error processing follow-up for appointment ${appointment._id}:`, error);
                    continue;
                }
            }
            
            console.log('Follow-up check completed');
        } catch (error) {
            console.error('Error checking follow-ups:', error);
        }
    }

    /**
     * Determine follow-up method using EMR patient data
     */
    determineFollowUpMethod(appointment, emrPatient) {
        const followUpMethod = appointment.followUp?.method;
        if (followUpMethod && followUpMethod !== 'auto') {
            return followUpMethod;
        }
        return this.chooseCommincationMethod(emrPatient);
    }

    /**
     * Trigger follow-up call using EMR patient data
     */
    async triggerFollowUpCall(appointment, emrPatient) {
        try {
            console.log(`📞 Calling ${emrPatient.phone} for follow-up: appointment ${appointment._id}`);

            await Appointment.findByIdAndUpdate(appointment._id, {
                $set: {
                    'followUp.status': 'in_progress',
                    'followUp.lastAttempt': new Date()
                },
                $inc: {
                    'followUp.attemptCount': 1
                }
            });

            const callResult = await callService.makeFollowUpCall({
                patientId: emrPatient._id.toString(),
                appointmentId: appointment._id.toString(),
                followUpType: 'post_appointment',
                notes: `Follow-up call for appointment on ${appointment.dateTime.toLocaleDateString()}`,
                hospitalId: appointment.hospitalId
            });

            await Appointment.findByIdAndUpdate(appointment._id, {
                $set: {
                    'followUp.sentAt': new Date(),
                    'followUp.callSid': callResult.call.sid,
                    'followUp.status': 'sent',
                    'followUp.method': 'call',
                    'followUp.callRecordId': callResult.call.callRecordId,
                    'followUp.emrPatientId': emrPatient.fhirId || emrPatient._id
                }
            });

            console.log(`✅ Follow-up call initiated for appointment ${appointment._id}`);

        } catch (error) {
            console.error(`Error with follow-up call for appointment ${appointment._id}:`, error);
            await this.updateFollowUpStatus(appointment._id, 'failed', error.message);
        }
    }

    /**
     * Trigger follow-up message using EMR patient data
     */
    async triggerFollowUpMessage(appointment, method, emrPatient) {
        try {
            console.log(`💬 Messaging ${emrPatient.phone} (${method}) for follow-up: appointment ${appointment._id}`);

            await Appointment.findByIdAndUpdate(appointment._id, {
                $set: {
                    'followUp.status': 'in_progress',
                    'followUp.lastAttempt': new Date()
                },
                $inc: {
                    'followUp.attemptCount': 1
                }
            });

            const result = await messageService.startMessageConversation(
                appointment._id,
                'follow_up',
                method
            );

            if (result.success) {
                await Appointment.findByIdAndUpdate(appointment._id, {
                    $set: {
                        'followUp.sentAt': new Date(),
                        'followUp.messageSid': result.messageSid,
                        'followUp.conversationId': result.conversationId,
                        'followUp.status': 'sent_message',
                        'followUp.method': method,
                        'followUp.emrPatientId': emrPatient.fhirId || emrPatient._id
                    }
                });

                console.log(`✅ Follow-up message sent for appointment ${appointment._id}`);
            } else {
                throw new Error(result.error || 'Failed to send follow-up message');
            }

        } catch (error) {
            console.error(`Error with follow-up message for appointment ${appointment._id}:`, error);
            await this.updateFollowUpStatus(appointment._id, 'failed', error.message);
        }
    }

    /**
     * Monitor conversations and handle escalations
     */
    async monitorConversations() {
        try {
            const escalationCandidates = await Appointment.find({
                'followUp.status': 'sent_message',
                'followUp.method': { $in: ['sms', 'whatsapp'] },
                'followUp.attemptCount': { $gte: 2 },
                'followUp.sentAt': { 
                    $lte: new Date(Date.now() - (2 * 60 * 60 * 1000))
                }
            });

            for (const appointment of escalationCandidates) {
                try {
                    console.log(`🔄 Escalating follow-up to call for appointment ${appointment._id}`);
                    
                    // Get fresh EMR patient data for escalation
                    const patientResult = await fhirSearchService.findOrImportPatientByPhone(
                        appointment.patient.phone || appointment.patientPhone
                    );

                    if (!patientResult.success || !patientResult.patient) {
                        console.log(`❌ Could not fetch patient from EMR for escalation ${appointment._id}`);
                        continue;
                    }

                    await appointment.escalateFollowUp('no_response');
                    await this.triggerFollowUpCall(appointment, patientResult.patient);

                } catch (error) {
                    console.error(`Error escalating appointment ${appointment._id}:`, error);
                    continue;
                }
            }

        } catch (error) {
            console.error('Error monitoring conversations:', error);
        }
    }

    /**
     * Helper methods
     */
    async updateReminderAttempt(appointmentId, reminderType, isRetry) {
        try {
            const now = new Date();

            if (isRetry) {
                await Appointment.findByIdAndUpdate(appointmentId, {
                    $inc: { [`reminders.${reminderType}.attemptCount`]: 1 },
                    $set: {
                        [`reminders.${reminderType}.status`]: 'sent',
                        [`reminders.${reminderType}.lastAttempt`]: now
                    }
                });
            } else {
                const appointment = await Appointment.findById(appointmentId);
                const currentAttemptCount = appointment.reminders?.[reminderType]?.attemptCount || 0;
                
                await Appointment.findByIdAndUpdate(appointmentId, {
                    $set: {
                        [`reminders.${reminderType}.status`]: 'sent',
                        [`reminders.${reminderType}.attemptCount`]: currentAttemptCount + 1,
                        [`reminders.${reminderType}.lastAttempt`]: now
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
                    [`reminders.${reminderType}.status`]: status,
                    [`reminders.${reminderType}.lastAttempt`]: new Date()
                }
            });
        } catch (error) {
            console.error(`Error updating reminder status for appointment ${appointmentId}:`, error);
        }
    }

    async updateFollowUpStatus(appointmentId, status, errorMessage = null) {
        try {
            const updateObj = {
                $set: {
                    'followUp.status': status,
                    'followUp.lastStatusUpdate': new Date()
                }
            };

            if (errorMessage) {
                updateObj.$set['followUp.errorMessage'] = errorMessage;
            }

            await Appointment.findByIdAndUpdate(appointmentId, updateObj);
        } catch (error) {
            console.error(`Error updating follow-up status for appointment ${appointmentId}:`, error);
        }
    }

    /**
     * Retry failed communications with fresh EMR data
     */
    async retryFailedCommunications() {
        try {
            console.log('Retrying failed communications...');

            const failedAppointments = await Appointment.find({
                $or: [
                    { 
                        'reminders.24_hour.status': { $in: ['failed', 'no_answer'] },
                        'reminders.24_hour.attemptCount': { $lt: this.maxRetries }
                    },
                    { 
                        'reminders.1_hour.status': { $in: ['failed', 'no_answer'] },
                        'reminders.1_hour.attemptCount': { $lt: this.maxRetries }
                    },
                    { 
                        'followUp.status': { $in: ['failed', 'no_answer'] },
                        'followUp.attemptCount': { $lt: this.maxRetries }
                    }
                ]
            });

            for (const appointment of failedAppointments) {
                try {
                    // Get fresh EMR patient data for retry
                    const patientResult = await fhirSearchService.findOrImportPatientByPhone(
                        appointment.patient.phone || appointment.patientPhone
                    );

                    if (!patientResult.success || !patientResult.patient) {
                        console.log(`❌ Could not fetch patient from EMR for retry ${appointment._id}`);
                        continue;
                    }

                    const emrPatient = patientResult.patient;

                    // Retry 24-hour reminder if needed
                    if (this.needsRetry(appointment.reminders?.['24_hour'])) {
                        await this.retryReminder(appointment, '24_hour', emrPatient);
                    }

                    // Retry 1-hour reminder if needed
                    if (this.needsRetry(appointment.reminders?.['1_hour'])) {
                        await this.retryReminder(appointment, '1_hour', emrPatient);
                    }

                    // Retry follow-up if needed
                    if (this.needsRetry(appointment.followUp)) {
                        await this.retryFollowUp(appointment, emrPatient);
                    }

                } catch (error) {
                    console.error(`Error retrying appointment ${appointment._id}:`, error);
                    continue;
                }
            }
        } catch (error) {
            console.error('Error retrying failed communications:', error);
        }
    }

    async retryReminder(appointment, reminderType, emrPatient) {
        const communicationMethod = this.determineReminderMethod(appointment, reminderType, emrPatient);

        if (communicationMethod === 'call') {
            await this.triggerReminderCall(appointment, reminderType, emrPatient);
        } else {
            await this.triggerReminderMessage(appointment, reminderType, communicationMethod, emrPatient);
        }
    }

    async retryFollowUp(appointment, emrPatient) {
        const communicationMethod = this.determineFollowUpMethod(appointment, emrPatient);

        if (communicationMethod === 'call') {
            await this.triggerFollowUpCall(appointment, emrPatient);
        } else {
            await this.triggerFollowUpMessage(appointment, communicationMethod, emrPatient);
        }
    }

    needsRetry(communicationRecord) {
        return communicationRecord &&
            ['failed', 'no_answer'].includes(communicationRecord.status) &&
            (communicationRecord.attemptCount || 1) <= this.maxRetries;
    }

    /**
     * Get statistics
     */
    async getUnifiedStats(dateRange = 7) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - dateRange);

            const appointmentStats = await Appointment.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate },
                        $or: [
                            { 'reminders.24_hour': { $exists: true } },
                            { 'reminders.1_hour': { $exists: true } },
                            { 'followUp': { $exists: true } }
                        ]
                    }
                },
                {
                    $project: {
                        _id: 1,
                        reminderMethod24h: '$reminders.24_hour.method',
                        reminderMethod1h: '$reminders.1_hour.method',
                        followUpMethod: '$followUp.method',
                        reminderStatus24h: '$reminders.24_hour.status',
                        reminderStatus1h: '$reminders.1_hour.status',
                        followUpStatus: '$followUp.status',
                        emrPatientId24h: '$reminders.24_hour.emrPatientId',
                        emrPatientId1h: '$reminders.1_hour.emrPatientId',
                        emrPatientIdFollowUp: '$followUp.emrPatientId'
                    }
                }
            ]);

            return {
                dateRange: dateRange,
                appointments: {
                    total: appointmentStats.length,
                    withReminders: appointmentStats.filter(a => a.reminderMethod24h || a.reminderMethod1h).length,
                    withFollowUps: appointmentStats.filter(a => a.followUpMethod).length,
                    emrSynced: appointmentStats.filter(a => a.emrPatientId24h || a.emrPatientId1h || a.emrPatientIdFollowUp).length
                },
                communicationMethods: this.calculateMethodBreakdown(appointmentStats),
                note: 'All communications use fresh EMR/FHIR patient data'
            };

        } catch (error) {
            console.error('Error getting unified stats:', error);
            return { error: error.message };
        }
    }

    calculateMethodBreakdown(appointmentStats) {
        const breakdown = {
            call: 0,
            sms: 0,
            whatsapp: 0,
            mixed: 0
        };

        appointmentStats.forEach(apt => {
            const methods = new Set();

            if (apt.reminderMethod24h) methods.add(apt.reminderMethod24h);
            if (apt.reminderMethod1h) methods.add(apt.reminderMethod1h);
            if (apt.followUpMethod) methods.add(apt.followUpMethod);

            if (methods.has('call') && methods.size === 1) {
                breakdown.call++;
            } else if (methods.has('sms') && methods.size === 1) {
                breakdown.sms++;
            } else if (methods.has('whatsapp') && methods.size === 1) {
                breakdown.whatsapp++;
            } else if (methods.size > 1) {
                breakdown.mixed++;
            }
        });

        return breakdown;
    }
}

const messageAutomationService = new MessageAutomationService();
export default messageAutomationService;