// import mongoose from "mongoose";

// const appointmentSchema = new mongoose.Schema({
//   patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
//   doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
//   dateTime: { type: Date, required: true },
//   status: {
//     type: String,
//     enum: ['initiated', 'scheduled', 'confirmed', 'rescheduled', 'cancelled'],
//     default: 'initiated'
//   },
//   reason: String,

//   reminderCalls: {
//     "24_hour": {
//       sentAt: { type: Date },
//       callSid: { type: String },
//       status: {
//         type: String,
//         enum: ['not_sent', 'sent', 'answered', 'no_answer', 'failed'],
//         default: 'not_sent'
//       },
//       response: {
//         type: String,
//         enum: ['confirmed', 'rescheduled', 'cancelled', 'no_response'],
//       },
//       attemptCount: { type: Number, default: 1 },
//       lastAttempt: { type: Date }
//     },
//     "1_hour": {
//       sentAt: { type: Date },
//       callSid: { type: String },
//       status: {
//         type: String,
//         enum: ['not_sent', 'sent', 'answered', 'no_answer', 'failed'],
//         default: 'not_sent'
//       },
//       response: {
//         type: String,
//         enum: ['confirmed', 'rescheduled', 'cancelled', 'no_show'],
//       },
//       attemptCount: { type: Number, default: 1 },
//       lastAttempt: { type: Date }
//     }
//   },
//   reminderPreferences: {
//     enabled: { type: Boolean, default: true },
//     methods: [{ type: String, enum: ['call', 'sms', 'email'], default: 'call' }],
//     timePreferences: {
//       dayBefore: { type: Boolean, default: true },
//       hourBefore: { type: Boolean, default: true }
//     }
//   },

//   // Follow-up call tracking - NEW ADDITION
//   followUpCall: {
//     enabled: {
//       type: Boolean,
//       default: true
//     },
//     status: {
//       type: String,
//       enum: [
//         'not_scheduled',  // Default state
//         'scheduled',      // Scheduled but not sent yet
//         'in_progress',    // Currently being processed
//         'sent',          // Call initiated
//         'answered',      // Call was answered
//         'no_answer',     // No answer received
//         'busy',          // Line was busy
//         'failed',        // Call failed
//         'canceled'       // Manually canceled
//       ],
//       default: 'not_scheduled'
//     },
//     scheduledDate: {
//       type: Date
//     },
//     scheduledAt: {
//       type: Date
//     },
//     attemptCount: {
//       type: Number,
//       default: 0
//     },
//     maxAttempts: {
//       type: Number,
//       default: 3
//     },
//     lastAttempt: {
//       type: Date
//     },
//     sentAt: {
//       type: Date
//     },
//     callSid: {
//       type: String
//     },
//     callRecordId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Call'
//     },
//     lastStatusUpdate: {
//       type: Date
//     },
//     errorMessage: {
//       type: String
//     },
//     notes: {
//       type: String
//     },
//     toggledAt: {
//       type: Date
//     }
//   }
// }, {
//   timestamps: true
// });

// // Indexes for efficient queries
// appointmentSchema.index({ patient: 1, dateTime: -1 });
// appointmentSchema.index({ doctor: 1, dateTime: 1 });
// appointmentSchema.index({ dateTime: 1 });
// appointmentSchema.index({ status: 1 });
// appointmentSchema.index({ hospitalId: 1 });
// appointmentSchema.index({ completedAt: 1 });

// // Follow-up specific indexes
// appointmentSchema.index({ 'followUpCall.status': 1, 'followUpCall.scheduledDate': 1 });
// appointmentSchema.index({ 'followUpCall.enabled': 1, 'followUpCall.attemptCount': 1 });
// appointmentSchema.index({ 'followUpCall.lastAttempt': 1 });
// appointmentSchema.index({ 'followUpCall.scheduledAt': 1 });

// // Pre-save middleware to handle status transitions
// appointmentSchema.pre('save', function (next) {
//   // If appointment is being marked as completed and completedAt is not set
//   if (this.status === 'completed' && !this.completedAt) {
//     this.completedAt = new Date();
//   }

//   // Initialize followUpCall object if it doesn't exist
//   if (!this.followUpCall) {
//     this.followUpCall = {
//       enabled: true,
//       status: 'not_scheduled',
//       attemptCount: 0,
//       maxAttempts: 3
//     };
//   }

//   next();
// });

// // Instance methods
// appointmentSchema.methods.markCompleted = function () {
//   this.status = 'completed';
//   this.completedAt = new Date();
//   return this.save();
// };

// appointmentSchema.methods.enableFollowUp = function () {
//   this.followUpCall.enabled = true;
//   this.followUpCall.toggledAt = new Date();
//   return this.save();
// };

// appointmentSchema.methods.disableFollowUp = function () {
//   this.followUpCall.enabled = false;
//   this.followUpCall.toggledAt = new Date();
//   return this.save();
// };

// // Static methods
// appointmentSchema.statics.findPendingFollowUps = function () {
//   return this.find({
//     'followUpCall.status': 'scheduled',
//     'followUpCall.scheduledDate': { $lte: new Date() },
//     'followUpCall.enabled': true,
//     'followUpCall.attemptCount': { $lt: 3 }
//   });
// };

// appointmentSchema.statics.findCompletedWithoutFollowUp = function (hoursAgo = 24) {
//   const cutoffTime = new Date();
//   cutoffTime.setHours(cutoffTime.getHours() - hoursAgo);

//   return this.find({
//     completedAt: { $exists: true, $gte: cutoffTime },
//     $or: [
//       { 'followUpCall.status': 'not_scheduled' },
//       { 'followUpCall.status': { $exists: false } },
//       { 'followUpCall': { $exists: false } }
//     ],
//     $or: [
//       { 'followUpCall.enabled': true },
//       { 'followUpCall.enabled': { $exists: false } }
//     ]
//   });
// };

// const Appointment = mongoose.model('Appointment', appointmentSchema);

// export default Appointment;



// import mongoose from "mongoose";

// const appointmentSchema = new mongoose.Schema({
//   patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
//   doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
//   hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
//   dateTime: { type: Date, required: true },
//   status: {
//     type: String,
//     enum: ['initiated', 'scheduled', 'confirmed', 'rescheduled', 'cancelled', 'completed'],
//     default: 'scheduled'
//   },
//   completedAt: { type: Date },
//   reason: String,

//   // UPDATED: Unified reminder system for both calls and messages
//   reminders: {
//     "24_hour": {
//       enabled: { type: Boolean, default: true },
//       method: {
//         type: String,
//         enum: ['call', 'sms', 'whatsapp', 'auto'], // 'auto' uses patient preference
//         default: 'auto'
//       },
//       status: {
//         type: String,
//         enum: ['not_sent', 'sent', 'delivered', 'read', 'answered', 'no_answer', 'failed'],
//         default: 'not_sent'
//       },
//       response: {
//         type: String,
//         enum: ['confirmed', 'rescheduled', 'cancelled', 'no_response'],
//       },
//       sentAt: { type: Date },
//       callSid: { type: String }, // For calls
//       messageSid: { type: String }, // For messages
//       conversationId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Message'
//       }, // Link to message conversation
//       lastAttempt: { type: Date },
//       attemptCount: { type: Number, default: 0 },
//       maxAttempts: { type: Number, default: 3 },
//       errorMessage: { type: String }
//     },
//     "1_hour": {
//       enabled: { type: Boolean, default: true },
//       method: {
//         type: String,
//         enum: ['call', 'sms', 'whatsapp', 'auto'],
//         default: 'auto'
//       },
//       status: {
//         type: String,
//         enum: ['not_sent', 'sent', 'delivered', 'read', 'answered', 'no_answer', 'failed'],
//         default: 'not_sent'
//       },
//       response: {
//         type: String,
//         enum: ['confirmed', 'rescheduled', 'cancelled', 'no_show'],
//       },
//       sentAt: { type: Date },
//       callSid: { type: String },
//       messageSid: { type: String },
//       conversationId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Message'
//       },
//       attemptCount: { type: Number, default: 0 },
//       maxAttempts: { type: Number, default: 3 },
//       lastAttempt: { type: Date },
//       errorMessage: { type: String }
//     }
//   },

//   // DEPRECATED: Keep for backward compatibility, but use unified 'reminders' instead
//   reminderCalls: {
//     "24_hour": {
//       sentAt: { type: Date },
//       callSid: { type: String },
//       status: {
//         type: String,
//         enum: ['not_sent', 'sent', 'answered', 'no_answer', 'failed'],
//         default: 'not_sent'
//       },
//       response: {
//         type: String,
//         enum: ['confirmed', 'rescheduled', 'cancelled', 'no_response'],
//       },
//       attemptCount: { type: Number, default: 1 },
//       lastAttempt: { type: Date }
//     },
//     "1_hour": {
//       sentAt: { type: Date },
//       callSid: { type: String },
//       status: {
//         type: String,
//         enum: ['not_sent', 'sent', 'answered', 'no_answer', 'failed'],
//         default: 'not_sent'
//       },
//       response: {
//         type: String,
//         enum: ['confirmed', 'rescheduled', 'cancelled', 'no_show'],
//       },
//       attemptCount: { type: Number, default: 1 },
//       lastAttempt: { type: Date }
//     }
//   },

//   // UPDATED: Enhanced reminder preferences
//   reminderPreferences: {
//     enabled: { type: Boolean, default: true },
//     // Primary method preference
//     preferredMethod: {
//       type: String,
//       enum: ['call', 'sms', 'whatsapp', 'both_messages', 'auto'],
//       default: 'auto' // Uses patient's global communication preference
//     },
//     // Fallback method if primary fails
//     fallbackMethod: {
//       type: String,
//       enum: ['call', 'sms', 'whatsapp', 'none'],
//       default: 'call'
//     },
//     timePreferences: {
//       dayBefore: { type: Boolean, default: true },
//       hourBefore: { type: Boolean, default: true }
//     },
//     // Message-specific preferences
//     messagePreferences: {
//       language: { type: String, default: 'en' },
//       includeLocation: { type: Boolean, default: true },
//       includeDoctorName: { type: Boolean, default: true }
//     }
//   },

//   // UPDATED: Unified follow-up system for both calls and messages
//   followUp: {
//     enabled: { type: Boolean, default: true },
//     method: {
//       type: String,
//       enum: ['call', 'sms', 'whatsapp', 'auto'],
//       default: 'auto' // Uses patient preference
//     },
//     status: {
//       type: String,
//       enum: [
//         'not_scheduled',  // Default state
//         'scheduled',      // Scheduled but not sent yet
//         'in_progress',    // Currently being processed
//         'sent',          // Call initiated or message sent
//         'sent_message',  // Specifically for messages
//         'delivered',     // Message delivered
//         'read',          // Message read
//         'answered',      // Call was answered or message replied to
//         'no_answer',     // No answer received (call) or no reply (message)
//         'busy',          // Line was busy (call only)
//         'failed',        // Communication failed
//         'completed',     // Follow-up completed successfully
//         'escalated',     // Escalated from message to call
//         'canceled'       // Manually canceled
//       ],
//       default: 'not_scheduled'
//     },
//     scheduledDate: { type: Date },
//     scheduledAt: { type: Date },
//     attemptCount: { type: Number, default: 0 },
//     maxAttempts: { type: Number, default: 3 },
//     lastAttempt: { type: Date },
//     sentAt: { type: Date },

//     // Communication tracking
//     callSid: { type: String },
//     messageSid: { type: String },
//     conversationId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Message'
//     },
//     callRecordId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Call'
//     },

//     // Escalation tracking
//     escalatedAt: { type: Date },
//     escalationReason: {
//       type: String,
//       enum: ['no_response', 'patient_request', 'complex_issue', 'manual']
//     },

//     lastStatusUpdate: { type: Date },
//     errorMessage: { type: String },
//     notes: { type: String },
//     toggledAt: { type: Date },

//     // Follow-up results
//     outcome: {
//       type: String,
//       enum: ['satisfied', 'needs_attention', 'complaint', 'referral', 'no_response']
//     },
//     patientFeedback: { type: String },
//     actionRequired: { type: Boolean, default: false },
//     assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
//   },

//   // DEPRECATED: Keep for backward compatibility
//   followUpCall: {
//     enabled: { type: Boolean, default: true },
//     status: {
//       type: String,
//       enum: [
//         'not_scheduled', 'scheduled', 'in_progress', 'sent', 'answered',
//         'no_answer', 'busy', 'failed', 'canceled', 'sent_message'
//       ],
//       default: 'not_scheduled'
//     },
//     scheduledDate: { type: Date },
//     scheduledAt: { type: Date },
//     attemptCount: { type: Number, default: 0 },
//     maxAttempts: { type: Number, default: 3 },
//     lastAttempt: { type: Date },
//     sentAt: { type: Date },
//     callSid: { type: String },
//     messageSid: { type: String }, // Added for message support
//     method: { type: String, enum: ['call', 'sms', 'whatsapp'] }, // Added method tracking
//     callRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'Call' },
//     lastStatusUpdate: { type: Date },
//     errorMessage: { type: String },
//     notes: { type: String },
//     toggledAt: { type: Date }
//   },

//   // Communication history summary
//   communicationSummary: {
//     totalReminders: { type: Number, default: 0 },
//     totalFollowUps: { type: Number, default: 0 },
//     callsAttempted: { type: Number, default: 0 },
//     messagesAttempted: { type: Number, default: 0 },
//     successfulContacts: { type: Number, default: 0 },
//     lastContactMethod: {
//       type: String,
//       enum: ['call', 'sms', 'whatsapp']
//     },
//     lastContactAt: { type: Date },
//     patientResponsiveness: {
//       type: String,
//       enum: ['high', 'medium', 'low', 'unknown'],
//       default: 'unknown'
//     }
//   }
// }, {
//   timestamps: true
// });

// // UPDATED: Enhanced indexes for unified communication
// appointmentSchema.index({ patient: 1, dateTime: -1 });
// appointmentSchema.index({ doctor: 1, dateTime: 1 });
// appointmentSchema.index({ dateTime: 1 });
// appointmentSchema.index({ status: 1 });
// appointmentSchema.index({ completedAt: 1 });

// // Unified reminder indexes
// appointmentSchema.index({ 'reminders.24_hour.status': 1, 'reminders.24_hour.method': 1 });
// appointmentSchema.index({ 'reminders.1_hour.status': 1, 'reminders.1_hour.method': 1 });
// appointmentSchema.index({ 'reminders.24_hour.sentAt': 1 });
// appointmentSchema.index({ 'reminders.1_hour.sentAt': 1 });

// // Unified follow-up indexes
// appointmentSchema.index({ 'followUp.status': 1, 'followUp.scheduledDate': 1 });
// appointmentSchema.index({ 'followUp.enabled': 1, 'followUp.attemptCount': 1 });
// appointmentSchema.index({ 'followUp.method': 1, 'followUp.status': 1 });
// appointmentSchema.index({ 'followUp.lastAttempt': 1 });

// // Communication summary indexes
// appointmentSchema.index({ 'communicationSummary.lastContactMethod': 1 });
// appointmentSchema.index({ 'communicationSummary.patientResponsiveness': 1 });

// // Pre-save middleware
// appointmentSchema.pre('save', function (next) {
//   if (this.status === 'completed' && !this.completedAt) {
//     this.completedAt = new Date();
//   }

//   // Initialize unified structures if they don't exist
//   if (!this.reminders) {
//     this.reminders = {
//       "24_hour": {
//         enabled: true,
//         method: 'auto',
//         status: 'not_sent',
//         attemptCount: 0,
//         maxAttempts: 3
//       },
//       "1_hour": {
//         enabled: true,
//         method: 'auto',
//         status: 'not_sent',
//         attemptCount: 0,
//         maxAttempts: 3
//       }
//     };
//   }

//   if (!this.followUp) {
//     this.followUp = {
//       enabled: true,
//       method: 'auto',
//       status: 'not_scheduled',
//       attemptCount: 0,
//       maxAttempts: 3
//     };
//   }

//   if (!this.communicationSummary) {
//     this.communicationSummary = {
//       totalReminders: 0,
//       totalFollowUps: 0,
//       callsAttempted: 0,
//       messagesAttempted: 0,
//       successfulContacts: 0,
//       patientResponsiveness: 'unknown'
//     };
//   }

//   // Update communication summary
//   this.updateCommunicationSummary();

//   next();
// });

// appointmentSchema.methods.markCompleted = function () {
//   this.status = 'completed';
//   this.completedAt = new Date();
//   return this.save();
// };

// // UPDATED: Enhanced instance methods
// appointmentSchema.methods.updateCommunicationSummary = function () {
//   const summary = this.communicationSummary;

//   // Count reminders
//   summary.totalReminders = 0;
//   if (this.reminders['24_hour'].status !== 'not_sent') summary.totalReminders++;
//   if (this.reminders['1_hour'].status !== 'not_sent') summary.totalReminders++;

//   // Count follow-ups
//   summary.totalFollowUps = this.followUp.status !== 'not_scheduled' ? 1 : 0;

//   // Count by method
//   summary.callsAttempted = this.countAttemptsByMethod('call');
//   summary.messagesAttempted = this.countAttemptsByMethod(['sms', 'whatsapp']);

//   // Count successful contacts
//   summary.successfulContacts = this.countSuccessfulContacts();

//   // Determine responsiveness
//   summary.patientResponsiveness = this.calculateResponsiveness();
// };

// appointmentSchema.methods.countAttemptsByMethod = function (methods) {
//   if (typeof methods === 'string') methods = [methods];

//   let count = 0;

//   // Check reminders
//   if (methods.includes(this.reminders['24_hour'].method)) {
//     count += this.reminders['24_hour'].attemptCount || 0;
//   }
//   if (methods.includes(this.reminders['1_hour'].method)) {
//     count += this.reminders['1_hour'].attemptCount || 0;
//   }

//   // Check follow-up
//   if (methods.includes(this.followUp.method)) {
//     count += this.followUp.attemptCount || 0;
//   }

//   return count;
// };

// appointmentSchema.methods.countSuccessfulContacts = function () {
//   let count = 0;

//   // Check reminder responses
//   if (this.reminders['24_hour'].response && this.reminders['24_hour'].response !== 'no_response') {
//     count++;
//   }
//   if (this.reminders['1_hour'].response && this.reminders['1_hour'].response !== 'no_response') {
//     count++;
//   }

//   // Check follow-up success
//   const successStatuses = ['answered', 'completed', 'delivered', 'read'];
//   if (successStatuses.includes(this.followUp.status)) {
//     count++;
//   }

//   return count;
// };

// appointmentSchema.methods.calculateResponsiveness = function () {
//   const total = this.communicationSummary.totalReminders + this.communicationSummary.totalFollowUps;
//   const successful = this.communicationSummary.successfulContacts;

//   if (total === 0) return 'unknown';

//   const rate = successful / total;
//   if (rate >= 0.8) return 'high';
//   if (rate >= 0.5) return 'medium';
//   return 'low';
// };

// appointmentSchema.methods.setReminderMethod = function (reminderType, method) {
//   if (!this.reminders[reminderType]) return false;

//   this.reminders[reminderType].method = method;
//   return this.save();
// };

// appointmentSchema.methods.setFollowUpMethod = function (method) {
//   this.followUp.method = method;
//   return this.save();
// };

// appointmentSchema.methods.escalateFollowUp = function (reason = 'no_response') {
//   this.followUp.status = 'escalated';
//   this.followUp.escalatedAt = new Date();
//   this.followUp.escalationReason = reason;
//   // Change method to call for escalation
//   this.followUp.method = 'call';
//   return this.save();
// };

// // UPDATED: Enhanced static methods
// appointmentSchema.statics.findPendingReminders = function (reminderType, method = null) {
//   const now = new Date();
//   let query = {};

//   if (reminderType === '24_hour') {
//     const tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
//     query = {
//       dateTime: {
//         $gte: new Date(tomorrow.getTime() - (30 * 60 * 1000)), // 30 min window
//         $lte: new Date(tomorrow.getTime() + (30 * 60 * 1000))
//       },
//       'reminders.24_hour.enabled': true,
//       'reminders.24_hour.status': 'not_sent',
//       'reminders.24_hour.attemptCount': { $lt: 3 }
//     };
//   } else if (reminderType === '1_hour') {
//     const oneHour = new Date(now.getTime() + (60 * 60 * 1000));
//     query = {
//       dateTime: {
//         $gte: new Date(oneHour.getTime() - (10 * 60 * 1000)), // 10 min window
//         $lte: new Date(oneHour.getTime() + (10 * 60 * 1000))
//       },
//       'reminders.1_hour.enabled': true,
//       'reminders.1_hour.status': 'not_sent',
//       'reminders.1_hour.attemptCount': { $lt: 3 }
//     };
//   }

//   if (method) {
//     query[`reminders.${reminderType}.method`] = method;
//   }

//   return this.find(query);
// };

// appointmentSchema.statics.findPendingFollowUps = function (method = null) {
//   let query = {
//     'followUp.status': 'scheduled',
//     'followUp.scheduledDate': { $lte: new Date() },
//     'followUp.enabled': true,
//     'followUp.attemptCount': { $lt: 3 }
//   };

//   if (method) {
//     query['followUp.method'] = method;
//   }

//   return this.find(query);
// };

// appointmentSchema.statics.findCompletedWithoutFollowUp = function (hoursAgo = 24) {
//   const cutoffTime = new Date();
//   cutoffTime.setHours(cutoffTime.getHours() - hoursAgo);

//   return this.find({
//     completedAt: { $exists: true, $gte: cutoffTime },
//     $or: [
//       { 'followUp.status': 'not_scheduled' },
//       { 'followUp.status': { $exists: false } },
//       { 'followUp': { $exists: false } }
//     ],
//     'followUp.enabled': { $ne: false }
//   });
// };

// appointmentSchema.statics.findEscalationCandidates = function () {
//   return this.find({
//     'followUp.status': 'sent_message',
//     'followUp.method': { $in: ['sms', 'whatsapp'] },
//     'followUp.attemptCount': { $gte: 2 },
//     'followUp.sentAt': {
//       $lte: new Date(Date.now() - (2 * 60 * 60 * 1000)) // 2 hours ago
//     }
//   });
// };

// const Appointment = mongoose.model('Appointment', appointmentSchema);

// export default Appointment;



{ /*with emr */}
// import mongoose from "mongoose";
// import fhirService from "../services/fhirService.js";

// const appointmentSchema = new mongoose.Schema({
//   patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
//   doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
//   hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
//   dateTime: { type: Date, required: true },
//   status: {
//     type: String,
//     enum: ['initiated', 'scheduled', 'confirmed', 'rescheduled', 'cancelled', 'completed', 'no_show'],
//     default: 'initiated'
//   },
//   reason: String,
//   completedAt: Date,

//   // FHIR Integration fields
//   fhirId: {
//     type: String,
//     index: true,
//     sparse: true
//   },
//   fhirLastSync: {
//     type: Date
//   },
//   fhirSyncStatus: {
//     type: String,
//     enum: ['pending', 'synced', 'error'],
//     default: 'pending'
//   },
//   fhirSyncError: String,

//   // Existing reminder and follow-up fields
//   reminders: {
//     "24_hour": {
//       enabled: { type: Boolean, default: true },
//       method: { type: String, enum: ['auto', 'call', 'sms', 'whatsapp'], default: 'auto' },
//       status: { type: String, enum: ['not_sent', 'sent', 'delivered', 'read', 'answered', 'no_answer', 'failed'], default: 'not_sent' },
//       sentAt: Date,
//       callSid: { type: String }, // For calls
//       messageSid: { type: String }, // For messages
//       conversationId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Message'
//       }, // Link to message conversation
//       lastAttempt: { type: Date },
//       attemptCount: { type: Number, default: 0 },
//       maxAttempts: { type: Number, default: 3 }
//     },
//     "1_hour": {
//       enabled: { type: Boolean, default: true },
//       method: { type: String, enum: ['auto', 'call', 'sms', 'whatsapp'], default: 'auto' },
//       status: { type: String, enum: ['not_sent', 'sent', 'delivered', 'read', 'answered', 'no_answer', 'failed'], default: 'not_sent' },
//       sentAt: Date,
//       callSid: { type: String }, // For calls
//       messageSid: { type: String }, // For messages
//       conversationId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Message'
//       }, // Link to message conversation
//       lastAttempt: { type: Date },
//       attemptCount: { type: Number, default: 0 },
//       maxAttempts: { type: Number, default: 3 }
//     }
//   },

//   reminderPreferences: {
//     enabled: { type: Boolean, default: true },
//     // Primary method preference
//     preferredMethod: {
//       type: String,
//       enum: ['call', 'sms', 'whatsapp', 'both_messages', 'auto'],
//       default: 'auto' // Uses patient's global communication preference
//     },
//     // Fallback method if primary fails
//     fallbackMethod: {
//       type: String,
//       enum: ['call', 'sms', 'whatsapp', 'none'],
//       default: 'call'
//     },
//     timePreferences: {
//       dayBefore: { type: Boolean, default: true },
//       hourBefore: { type: Boolean, default: true }
//     },
//     // Message-specific preferences
//     messagePreferences: {
//       language: { type: String, default: 'en' },
//       includeLocation: { type: Boolean, default: true },
//       includeDoctorName: { type: Boolean, default: true }
//     }
//   },

//   followUp: {
//     enabled: { type: Boolean, default: true },
//     method: { type: String, enum: ['auto', 'call', 'sms'], default: 'auto' },
//     status: {
//       type: String, enum: [
//         'not_scheduled',  // Default state
//         'scheduled',      // Scheduled but not sent yet
//         'in_progress',    // Currently being processed
//         'sent',          // Call initiated or message sent
//         'sent_message',  // Specifically for messages
//         'delivered',     // Message delivered
//         'read',          // Message read
//         'answered',      // Call was answered or message replied to
//         'no_answer',     // No answer received (call) or no reply (message)
//         'busy',          // Line was busy (call only)
//         'failed',        // Communication failed
//         'completed',     // Follow-up completed successfully
//         'escalated',     // Escalated from message to call
//         'canceled'       // Manually canceled
//       ],
//       default: 'not_scheduled'
//     },
//     scheduledDate: Date,
//     scheduledAt: Date,
//     attemptCount: { type: Number, default: 0 },
//     maxAttempts: { type: Number, default: 3 },
//     lastAttempt: { type: Date },
//     // Communication tracking
//     callSid: { type: String },
//     messageSid: { type: String },
//     conversationId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Message'
//     },
//     callRecordId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Call'
//     },

//     // Escalation tracking
//     escalatedAt: { type: Date },
//     escalationReason: {
//       type: String,
//       enum: ['no_response', 'patient_request', 'complex_issue', 'manual']
//     },

//     lastStatusUpdate: { type: Date },
//     errorMessage: { type: String },
//     notes: { type: String },
//     toggledAt: { type: Date },

//     // Follow-up results
//     outcome: {
//       type: String,
//       enum: ['satisfied', 'needs_attention', 'complaint', 'referral', 'no_response']
//     },
//     patientFeedback: { type: String },
//     actionRequired: { type: Boolean, default: false },
//     assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
//   },

//   communicationSummary: {
//     totalReminders: { type: Number, default: 0 },
//     totalFollowUps: { type: Number, default: 0 },
//     callsAttempted: { type: Number, default: 0 },
//     messagesAttempted: { type: Number, default: 0 },
//     successfulContacts: { type: Number, default: 0 },
//     lastContactMethod: {
//       type: String,
//       enum: ['call', 'sms', 'whatsapp']
//     },
//     lastContactAt: { type: Date },
//     patientResponsiveness: {
//       type: String,
//       enum: ['high', 'medium', 'low', 'unknown'],
//       default: 'unknown'
//     }
//   }
// }, {
//   timestamps: true
// });

// // Indexes
// appointmentSchema.index({ patient: 1, dateTime: -1 });
// appointmentSchema.index({ doctor: 1, dateTime: 1 });
// appointmentSchema.index({ dateTime: 1 });
// appointmentSchema.index({ status: 1 });
// // appointmentSchema.index({ fhirId: 1 });
// appointmentSchema.index({ fhirSyncStatus: 1 });

// // MIDDLEWARE: After saving appointment, sync to FHIR server
// appointmentSchema.post('save', async function (doc, next) {
//   try {
//     if (doc._skipFhirSync) {
//       return next();
//     }

//     // Need to populate patient and doctor for FHIR sync
//     await doc.populate(['patient', 'doctor']);

//     // Ensure patient and doctor have FHIR IDs
//     if (!doc.patient?.fhirId || !doc.doctor?.fhirId) {
//       console.warn('Cannot sync appointment to FHIR: Patient or Doctor missing FHIR ID');
//       return next();
//     }

//     let result;
//     if (doc.fhirId) {
//       result = await fhirService.updateAppointment(
//         doc.fhirId,
//         doc,
//         doc.patient.fhirId,
//         doc.doctor.fhirId
//       );
//     } else {
//       result = await fhirService.createAppointment(
//         doc,
//         doc.patient.fhirId,
//         doc.doctor.fhirId
//       );
//     }

//     if (result.success) {
//       await mongoose.model('Appointment').updateOne(
//         { _id: doc._id },
//         {
//           $set: {
//             fhirId: result.fhirId || doc.fhirId,
//             fhirLastSync: new Date(),
//             fhirSyncStatus: 'synced',
//             fhirSyncError: null
//           }
//         }
//       );
//     } else {
//       await mongoose.model('Appointment').updateOne(
//         { _id: doc._id },
//         {
//           $set: {
//             fhirSyncStatus: 'error',
//             fhirSyncError: JSON.stringify(result.error)
//           }
//         }
//       );
//       console.error('FHIR sync error for appointment:', doc._id, result.error);
//     }

//     next();
//   } catch (error) {
//     console.error('Error in FHIR sync middleware:', error);
//     next();
//   }
// });

// // INSTANCE METHODS

// appointmentSchema.methods.markCompleted = function () {
//   this.status = 'completed';
//   this.completedAt = new Date();
//   return this.save();
// };

// appointmentSchema.methods.syncToFHIR = async function () {
//   try {
//     await this.populate(['patient', 'doctor']);

//     if (!this.patient?.fhirId || !this.doctor?.fhirId) {
//       return {
//         success: false,
//         error: 'Patient or Doctor missing FHIR ID. Sync them first.'
//       };
//     }

//     let result;
//     if (this.fhirId) {
//       result = await fhirService.updateAppointment(
//         this.fhirId,
//         this,
//         this.patient.fhirId,
//         this.doctor.fhirId
//       );
//     } else {
//       result = await fhirService.createAppointment(
//         this,
//         this.patient.fhirId,
//         this.doctor.fhirId
//       );
//     }

//     if (result.success) {
//       this._skipFhirSync = true;
//       this.fhirId = result.fhirId || this.fhirId;
//       this.fhirLastSync = new Date();
//       this.fhirSyncStatus = 'synced';
//       this.fhirSyncError = null;
//       await this.save();
//       delete this._skipFhirSync;
//     } else {
//       this._skipFhirSync = true;
//       this.fhirSyncStatus = 'error';
//       this.fhirSyncError = JSON.stringify(result.error);
//       await this.save();
//       delete this._skipFhirSync;
//     }

//     return result;
//   } catch (error) {
//     console.error('Error syncing appointment to FHIR:', error);
//     return { success: false, error: error.message };
//   }
// };

// appointmentSchema.methods.fetchFromFHIR = async function () {
//   if (!this.fhirId) {
//     return { success: false, error: 'No FHIR ID available' };
//   }

//   try {
//     return await fhirService.getAppointment(this.fhirId);
//   } catch (error) {
//     console.error('Error fetching appointment from FHIR:', error);
//     return { success: false, error: error.message };
//   }
// };

// // STATIC METHODS

// appointmentSchema.statics.searchInFHIR = async function (searchParams) {
//   try {
//     return await fhirService.searchAppointments(searchParams);
//   } catch (error) {
//     console.error('Error searching appointments in FHIR:', error);
//     return { success: false, error: error.message };
//   }
// };

// export default mongoose.model("Appointment", appointmentSchema);


{/*for family */}

import mongoose from "mongoose";
import fhirService from "../services/fhirService.js";

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  dateTime: { type: Date, required: true },
  status: {
    type: String,
    enum: ['initiated', 'scheduled', 'confirmed', 'rescheduled', 'cancelled', 'completed', 'no_show'],
    default: 'initiated'
  },
  reason: String,
  completedAt: Date,

  // FHIR Integration fields
  fhirId: {
    type: String,
    index: true,
    sparse: true
  },
  fhirLastSync: {
    type: Date
  },
  fhirSyncStatus: {
    type: String,
    enum: ['pending', 'synced', 'error'],
    default: 'pending'
  },
  fhirSyncError: String,

  // Existing reminder and follow-up fields
  reminders: {
    "24_hour": {
      enabled: { type: Boolean, default: true },
      method: { type: String, enum: ['auto', 'call', 'sms', 'whatsapp'], default: 'auto' },
      status: { type: String, enum: ['not_sent', 'sent', 'delivered', 'read', 'answered', 'no_answer', 'failed'], default: 'not_sent' },
      sentAt: Date,
      callSid: { type: String }, // For calls
      messageSid: { type: String }, // For messages
      conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
      }, // Link to message conversation
      lastAttempt: { type: Date },
      attemptCount: { type: Number, default: 0 },
      maxAttempts: { type: Number, default: 3 }
    },
    "1_hour": {
      enabled: { type: Boolean, default: true },
      method: { type: String, enum: ['auto', 'call', 'sms', 'whatsapp'], default: 'auto' },
      status: { type: String, enum: ['not_sent', 'sent', 'delivered', 'read', 'answered', 'no_answer', 'failed'], default: 'not_sent' },
      sentAt: Date,
      callSid: { type: String }, // For calls
      messageSid: { type: String }, // For messages
      conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
      }, // Link to message conversation
      lastAttempt: { type: Date },
      attemptCount: { type: Number, default: 0 },
      maxAttempts: { type: Number, default: 3 }
    }
  },

  reminderPreferences: {
    enabled: { type: Boolean, default: true },
    // Primary method preference
    preferredMethod: {
      type: String,
      enum: ['call', 'sms', 'whatsapp', 'both_messages', 'auto'],
      default: 'auto' // Uses patient's global communication preference
    },
    // Fallback method if primary fails
    fallbackMethod: {
      type: String,
      enum: ['call', 'sms', 'whatsapp', 'none'],
      default: 'call'
    },
    timePreferences: {
      dayBefore: { type: Boolean, default: true },
      hourBefore: { type: Boolean, default: true }
    },
    // Message-specific preferences
    messagePreferences: {
      language: { type: String, default: 'en' },
      includeLocation: { type: Boolean, default: true },
      includeDoctorName: { type: Boolean, default: true }
    }
  },

  followUp: {
    enabled: { type: Boolean, default: true },
    method: { type: String, enum: ['auto', 'call', 'sms'], default: 'auto' },
    status: {
      type: String, enum: [
        'not_scheduled',  // Default state
        'scheduled',      // Scheduled but not sent yet
        'in_progress',    // Currently being processed
        'sent',          // Call initiated or message sent
        'sent_message',  // Specifically for messages
        'delivered',     // Message delivered
        'read',          // Message read
        'answered',      // Call was answered or message replied to
        'no_answer',     // No answer received (call) or no reply (message)
        'busy',          // Line was busy (call only)
        'failed',        // Communication failed
        'completed',     // Follow-up completed successfully
        'escalated',     // Escalated from message to call
        'canceled'       // Manually canceled
      ],
      default: 'not_scheduled'
    },
    scheduledDate: Date,
    scheduledAt: Date,
    attemptCount: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    lastAttempt: { type: Date },
    // Communication tracking
    callSid: { type: String },
    messageSid: { type: String },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    callRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Call'
    },

    // Escalation tracking
    escalatedAt: { type: Date },
    escalationReason: {
      type: String,
      enum: ['no_response', 'patient_request', 'complex_issue', 'manual']
    },

    lastStatusUpdate: { type: Date },
    errorMessage: { type: String },
    notes: { type: String },
    toggledAt: { type: Date },

    // Follow-up results
    outcome: {
      type: String,
      enum: ['satisfied', 'needs_attention', 'complaint', 'referral', 'no_response']
    },
    patientFeedback: { type: String },
    actionRequired: { type: Boolean, default: false },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },

  communicationSummary: {
    totalReminders: { type: Number, default: 0 },
    totalFollowUps: { type: Number, default: 0 },
    callsAttempted: { type: Number, default: 0 },
    messagesAttempted: { type: Number, default: 0 },
    successfulContacts: { type: Number, default: 0 },
    lastContactMethod: {
      type: String,
      enum: ['call', 'sms', 'whatsapp']
    },
    lastContactAt: { type: Date },
    patientResponsiveness: {
      type: String,
      enum: ['high', 'medium', 'low', 'unknown'],
      default: 'unknown'
    }
  },

  // ENHANCED BOOKING FIELDS - Support for self, family, and care center bookings
  bookingType: {
    type: String,
    enum: ['self', 'family', 'care_center', 'direct'],
    default: 'direct',
    index: true
  },
  
  // Track who made the booking (useful for family and care center bookings)
  bookedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    index: true
  },
  
  // Family booking specific fields
  familyRelationship: {
    type: String,
    enum: ['spouse', 'parent', 'child', 'sibling', 'grandparent', 'grandchild', 'other']
  },
  
  // Care center booking specific fields
  careCenterInfo: {
    careCenterName: String,
    patientId: String,
    medicalRecordNumber: String,
    contactPerson: String,
    contactPhone: String
  },
  
  confirmationNumber: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  }
}, {
  timestamps: true
});

// Indexes
appointmentSchema.index({ patient: 1, dateTime: -1 });
appointmentSchema.index({ doctor: 1, dateTime: 1 });
appointmentSchema.index({ dateTime: 1 });
appointmentSchema.index({ status: 1 });
// appointmentSchema.index({ fhirId: 1 });
appointmentSchema.index({ fhirSyncStatus: 1 });

// MIDDLEWARE: After saving appointment, sync to FHIR server
appointmentSchema.post('save', async function (doc, next) {
  try {
    if (doc._skipFhirSync) {
      return next();
    }

    // Need to populate patient and doctor for FHIR sync
    await doc.populate(['patient', 'doctor']);

    // Ensure patient and doctor have FHIR IDs
    if (!doc.patient?.fhirId || !doc.doctor?.fhirId) {
      console.warn('Cannot sync appointment to FHIR: Patient or Doctor missing FHIR ID');
      return next();
    }

    let result;
    if (doc.fhirId) {
      result = await fhirService.updateAppointment(
        doc.fhirId,
        doc,
        doc.patient.fhirId,
        doc.doctor.fhirId
      );
    } else {
      result = await fhirService.createAppointment(
        doc,
        doc.patient.fhirId,
        doc.doctor.fhirId
      );
    }

    if (result.success) {
      await mongoose.model('Appointment').updateOne(
        { _id: doc._id },
        {
          $set: {
            fhirId: result.fhirId || doc.fhirId,
            fhirLastSync: new Date(),
            fhirSyncStatus: 'synced',
            fhirSyncError: null
          }
        }
      );
    } else {
      await mongoose.model('Appointment').updateOne(
        { _id: doc._id },
        {
          $set: {
            fhirSyncStatus: 'error',
            fhirSyncError: JSON.stringify(result.error)
          }
        }
      );
      console.error('FHIR sync error for appointment:', doc._id, result.error);
    }

    next();
  } catch (error) {
    console.error('Error in FHIR sync middleware:', error);
    next();
  }
});

// INSTANCE METHODS

appointmentSchema.methods.markCompleted = function () {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

appointmentSchema.methods.syncToFHIR = async function () {
  try {
    await this.populate(['patient', 'doctor']);

    if (!this.patient?.fhirId || !this.doctor?.fhirId) {
      return {
        success: false,
        error: 'Patient or Doctor missing FHIR ID. Sync them first.'
      };
    }

    let result;
    if (this.fhirId) {
      result = await fhirService.updateAppointment(
        this.fhirId,
        this,
        this.patient.fhirId,
        this.doctor.fhirId
      );
    } else {
      result = await fhirService.createAppointment(
        this,
        this.patient.fhirId,
        this.doctor.fhirId
      );
    }

    if (result.success) {
      this._skipFhirSync = true;
      this.fhirId = result.fhirId || this.fhirId;
      this.fhirLastSync = new Date();
      this.fhirSyncStatus = 'synced';
      this.fhirSyncError = null;
      await this.save();
      delete this._skipFhirSync;
    } else {
      this._skipFhirSync = true;
      this.fhirSyncStatus = 'error';
      this.fhirSyncError = JSON.stringify(result.error);
      await this.save();
      delete this._skipFhirSync;
    }

    return result;
  } catch (error) {
    console.error('Error syncing appointment to FHIR:', error);
    return { success: false, error: error.message };
  }
};

appointmentSchema.methods.fetchFromFHIR = async function () {
  if (!this.fhirId) {
    return { success: false, error: 'No FHIR ID available' };
  }

  try {
    return await fhirService.getAppointment(this.fhirId);
  } catch (error) {
    console.error('Error fetching appointment from FHIR:', error);
    return { success: false, error: error.message };
  }
};

// STATIC METHODS

appointmentSchema.statics.searchInFHIR = async function (searchParams) {
  try {
    return await fhirService.searchAppointments(searchParams);
  } catch (error) {
    console.error('Error searching appointments in FHIR:', error);
    return { success: false, error: error.message };
  }
};

// ENHANCED BOOKING METHODS

// Pre-save hook to generate confirmation number if not exists
appointmentSchema.pre('save', function (next) {
  if (!this.confirmationNumber && this.isNew) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.confirmationNumber = `APT-${timestamp}-${random}`;
  }
  next();
});

// Instance method to get booking context (who booked for whom)
appointmentSchema.methods.getBookingContext = async function () {
  await this.populate('patient bookedBy');
  
  const context = {
    bookingType: this.bookingType,
    patient: {
      name: `${this.patient.firstName} ${this.patient.lastName}`,
      phone: this.patient.phone
    }
  };
  
  if (this.bookingType === 'self') {
    context.message = `Booked by patient themselves`;
  } else if (this.bookingType === 'family' && this.bookedBy) {
    context.bookedBy = {
      name: `${this.bookedBy.firstName} ${this.bookedBy.lastName}`,
      phone: this.bookedBy.phone,
      relationship: this.familyRelationship
    };
    context.message = `Booked by ${context.bookedBy.name} (${this.familyRelationship})`;
  } else if (this.bookingType === 'care_center') {
    context.careCenterInfo = this.careCenterInfo;
    context.message = `Booked for care center patient from ${this.careCenterInfo?.careCenterName || 'care facility'}`;
  }
  
  return context;
};

// Static method to find appointments by booking type
appointmentSchema.statics.findByBookingType = function (bookingType, filters = {}) {
  return this.find({
    bookingType,
    ...filters
  })
    .populate('patient', 'firstName lastName phone')
    .populate('doctor', 'name specialty')
    .populate('bookedBy', 'firstName lastName phone')
    .sort({ dateTime: 1 });
};

export default mongoose.model("Appointment", appointmentSchema);