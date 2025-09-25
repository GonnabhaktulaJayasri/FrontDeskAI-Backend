import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  dateTime: { type: Date, required: true },
  status: {
    type: String,
    enum: ['initiated', 'scheduled', 'confirmed', 'rescheduled', 'cancelled'],
    default: 'initiated'
  },
  reason: String,

  reminderCalls: {
    "24_hour": {
      sentAt: { type: Date },
      callSid: { type: String },
      status: {
        type: String,
        enum: ['not_sent', 'sent', 'answered', 'no_answer', 'failed'],
        default: 'not_sent'
      },
      response: {
        type: String,
        enum: ['confirmed', 'rescheduled', 'cancelled', 'no_response'],
      },
      attemptCount: { type: Number, default: 1 },
      lastAttempt: { type: Date }
    },
    "1_hour": {
      sentAt: { type: Date },
      callSid: { type: String },
      status: {
        type: String,
        enum: ['not_sent', 'sent', 'answered', 'no_answer', 'failed'],
        default: 'not_sent'
      },
      response: {
        type: String,
        enum: ['confirmed', 'rescheduled', 'cancelled', 'no_show'],
      },
      attemptCount: { type: Number, default: 1 },
      lastAttempt: { type: Date }
    }
  },
  reminderPreferences: {
    enabled: { type: Boolean, default: true },
    methods: [{ type: String, enum: ['call', 'sms', 'email'], default: 'call' }],
    timePreferences: {
      dayBefore: { type: Boolean, default: true },
      hourBefore: { type: Boolean, default: true }
    }
  },

  // Follow-up call tracking - NEW ADDITION
  followUpCall: {
    enabled: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: [
        'not_scheduled',  // Default state
        'scheduled',      // Scheduled but not sent yet
        'in_progress',    // Currently being processed
        'sent',          // Call initiated
        'answered',      // Call was answered
        'no_answer',     // No answer received
        'busy',          // Line was busy
        'failed',        // Call failed
        'canceled'       // Manually canceled
      ],
      default: 'not_scheduled'
    },
    scheduledDate: {
      type: Date
    },
    scheduledAt: {
      type: Date
    },
    attemptCount: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: 3
    },
    lastAttempt: {
      type: Date
    },
    sentAt: {
      type: Date
    },
    callSid: {
      type: String
    },
    callRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Call'
    },
    lastStatusUpdate: {
      type: Date
    },
    errorMessage: {
      type: String
    },
    notes: {
      type: String
    },
    toggledAt: {
      type: Date
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
appointmentSchema.index({ patient: 1, dateTime: -1 });
appointmentSchema.index({ doctor: 1, dateTime: 1 });
appointmentSchema.index({ dateTime: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ hospitalId: 1 });
appointmentSchema.index({ completedAt: 1 });

// Follow-up specific indexes
appointmentSchema.index({ 'followUpCall.status': 1, 'followUpCall.scheduledDate': 1 });
appointmentSchema.index({ 'followUpCall.enabled': 1, 'followUpCall.attemptCount': 1 });
appointmentSchema.index({ 'followUpCall.lastAttempt': 1 });
appointmentSchema.index({ 'followUpCall.scheduledAt': 1 });

// Pre-save middleware to handle status transitions
appointmentSchema.pre('save', function (next) {
  // If appointment is being marked as completed and completedAt is not set
  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }

  // Initialize followUpCall object if it doesn't exist
  if (!this.followUpCall) {
    this.followUpCall = {
      enabled: true,
      status: 'not_scheduled',
      attemptCount: 0,
      maxAttempts: 3
    };
  }

  next();
});

// Instance methods
appointmentSchema.methods.markCompleted = function () {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

appointmentSchema.methods.enableFollowUp = function () {
  this.followUpCall.enabled = true;
  this.followUpCall.toggledAt = new Date();
  return this.save();
};

appointmentSchema.methods.disableFollowUp = function () {
  this.followUpCall.enabled = false;
  this.followUpCall.toggledAt = new Date();
  return this.save();
};

// Static methods
appointmentSchema.statics.findPendingFollowUps = function () {
  return this.find({
    'followUpCall.status': 'scheduled',
    'followUpCall.scheduledDate': { $lte: new Date() },
    'followUpCall.enabled': true,
    'followUpCall.attemptCount': { $lt: 3 }
  });
};

appointmentSchema.statics.findCompletedWithoutFollowUp = function (hoursAgo = 24) {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - hoursAgo);

  return this.find({
    completedAt: { $exists: true, $gte: cutoffTime },
    $or: [
      { 'followUpCall.status': 'not_scheduled' },
      { 'followUpCall.status': { $exists: false } },
      { 'followUpCall': { $exists: false } }
    ],
    $or: [
      { 'followUpCall.enabled': true },
      { 'followUpCall.enabled': { $exists: false } }
    ]
  });
};

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;