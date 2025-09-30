import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    // Message identifiers
    messageSid: {
        type: String,
        unique: true,
        sparse: true
    },
    
    // Sender and recipient
    from: {
        type: String,
        required: true
    },
    to: {
        type: String,
        required: true
    },
    
    // Message content
    body: {
        type: String,
        required: true
    },
    
    // Direction
    direction: {
        type: String,
        enum: ['inbound', 'outbound'],
        required: true
    },
    
    // Status
    status: {
        type: String,
        enum: ['queued', 'sent', 'delivered', 'read', 'failed', 'received','escalated'],
        default: 'sent'
    },
    
    // References
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    appointment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment'
    },
    hospital: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital'
    },
    
    // Method
    method: {
        type: String,
        enum: ['sms', 'whatsapp'],
        required: true
    },
    
    // Conversation tracking
    isReminderFollowup: {
        type: Boolean,
        default: false
    },
    conversationType: {
        type: String,
        enum: ['appointment_reminder', '24_hour', '1_hour', 'follow_up', 'general', 'escalation']
    },
    
    // Twilio Conversation API support
    conversationSid: String,
    participantSid: String,
    
    // AI analysis (optional)
    aiProcessed: {
        type: Boolean,
        default: false
    },
    intent: String,
    confidence: Number,
    
    // Function calls (for AI responses)
    functionCalls: [{
        name: String,
        arguments: String,
        result: mongoose.Schema.Types.Mixed,
        timestamp: Date
    }],
    
    // Error tracking
    errorCode: String,
    errorMessage: String,
    
    // Additional metadata
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
    
}, {
    timestamps: true
});

// Indexes for efficient queries
messageSchema.index({ messageSid: 1 });
messageSchema.index({ from: 1, createdAt: -1 });
messageSchema.index({ to: 1, createdAt: -1 });
messageSchema.index({ patient: 1, createdAt: -1 });
messageSchema.index({ appointment: 1 });
messageSchema.index({ conversationSid: 1 });
messageSchema.index({ isReminderFollowup: 1, patient: 1 });
messageSchema.index({ method: 1, direction: 1 });
messageSchema.index({ status: 1, createdAt: -1 });

// Virtual for checking if WhatsApp
messageSchema.virtual('isWhatsApp').get(function() {
    return this.method === 'whatsapp' || this.from?.startsWith('whatsapp:') || this.to?.startsWith('whatsapp:');
});

// Static methods
messageSchema.statics.findConversation = function(phoneNumber, isReminderFollowup = true) {
    const cleanPhone = phoneNumber.replace('whatsapp:', '');
    return this.find({
        $or: [
            { from: cleanPhone },
            { from: `whatsapp:${cleanPhone}` },
            { to: cleanPhone },
            { to: `whatsapp:${cleanPhone}` }
        ],
        isReminderFollowup: isReminderFollowup
    }).sort({ createdAt: -1 });
};

messageSchema.statics.findRecentByPatient = function(patientId, limit = 10) {
    return this.find({ 
        patient: patientId,
        isReminderFollowup: true 
    })
    .sort({ createdAt: -1 })
    .limit(limit);
};

messageSchema.statics.findByConversationSid = function(conversationSid) {
    return this.find({ conversationSid })
        .sort({ createdAt: 1 })
        .populate('patient appointment');
};

messageSchema.statics.getConversationHistory = function(patientId, limit = 5) {
    return this.find({
        patient: patientId,
        isReminderFollowup: true
    })
    .sort({ createdAt: -1 })
    .limit(limit * 2)
    .lean();
};

// Instance methods
messageSchema.methods.markAsProcessed = function(intent, confidence) {
    this.aiProcessed = true;
    if (intent) this.intent = intent;
    if (confidence) this.confidence = confidence;
    return this.save();
};

messageSchema.methods.addFunctionCall = function(name, args, result) {
    this.functionCalls.push({
        name,
        arguments: JSON.stringify(args),
        result,
        timestamp: new Date()
    });
    return this.save();
};

// Pre-save middleware
messageSchema.pre('save', function(next) {
    // Clean phone numbers
    if (this.from && !this.from.startsWith('whatsapp:') && this.method === 'whatsapp') {
        this.from = `whatsapp:${this.from}`;
    }
    if (this.to && !this.to.startsWith('whatsapp:') && this.method === 'whatsapp') {
        this.to = `whatsapp:${this.to}`;
    }
    
    next();
});

const Message = mongoose.model('Message', messageSchema);

export default Message;