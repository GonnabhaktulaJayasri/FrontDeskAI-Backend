import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    // Patient reference
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    
    // Appointment reference
    appointment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment'
    },
    
    hospital: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital'
    },
    
    // Date for this conversation (normalized to start of day)
    conversationDate: {
        type: Date,
        required: true
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
    
    // Array of messages in this conversation
    messages: [{
        messageSid: String,
        from: {
            type: String,
            required: true
        },
        to: {
            type: String,
            required: true
        },
        body: {
            type: String,
            required: true
        },
        direction: {
            type: String,
            enum: ['inbound', 'outbound'],
            required: true
        },
        status: {
            type: String,
            enum: ['queued', 'sent', 'delivered', 'read', 'failed', 'received', 'escalated'],
            default: 'sent'
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        // AI analysis
        aiProcessed: {
            type: Boolean,
            default: false
        },
        intent: String,
        confidence: Number,
        // Function calls
        functionCalls: [{
            name: String,
            arguments: String,
            result: mongoose.Schema.Types.Mixed,
            timestamp: Date
        }],
        // Error tracking
        errorCode: String,
        errorMessage: String
    }],
    
    // Conversation metadata
    messageCount: {
        type: Number,
        default: 0
    },
    lastMessageAt: {
        type: Date,
        default: Date.now
    },
    conversationStatus: {
        type: String,
        enum: ['active', 'completed', 'escalated', 'expired'],
        default: 'active'
    },
    
    // Additional metadata
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
    
}, {
    timestamps: true
});

// Compound index to ensure one record per patient per day
messageSchema.index({ patient: 1, conversationDate: 1 }, { unique: true });
messageSchema.index({ patient: 1, createdAt: -1 });
messageSchema.index({ appointment: 1 });
messageSchema.index({ conversationSid: 1 });
messageSchema.index({ isReminderFollowup: 1, patient: 1 });
messageSchema.index({ method: 1, conversationDate: -1 });
messageSchema.index({ conversationStatus: 1, createdAt: -1 });

// Virtual for checking if WhatsApp
messageSchema.virtual('isWhatsApp').get(function() {
    return this.method === 'whatsapp';
});

// Static method: Find or create today's conversation
messageSchema.statics.findOrCreateTodayConversation = async function(patientId, data = {}) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let conversation = await this.findOne({
        patient: patientId,
        conversationDate: today
    });
    
    if (!conversation) {
        conversation = await this.create({
            patient: patientId,
            conversationDate: today,
            method: data.method || 'sms',
            isReminderFollowup: data.isReminderFollowup || false,
            conversationType: data.conversationType,
            appointment: data.appointment,
            hospital: data.hospital,
            conversationSid: data.conversationSid,
            messages: []
        });
    }
    
    return conversation;
};

// Static method: Get conversation for a specific date
messageSchema.statics.findConversationByDate = function(patientId, date) {
    const searchDate = new Date(date);
    searchDate.setHours(0, 0, 0, 0);
    
    return this.findOne({
        patient: patientId,
        conversationDate: searchDate
    }).populate('patient appointment hospital');
};

// Static method: Get recent conversations
messageSchema.statics.findRecentByPatient = function(patientId, limit = 10) {
    return this.find({ 
        patient: patientId,
        isReminderFollowup: true 
    })
    .sort({ conversationDate: -1 })
    .limit(limit)
    .populate('patient appointment');
};

// Static method: Get conversation history for AI
messageSchema.statics.getConversationHistory = async function(patientId, limit = 5) {
    const conversations = await this.find({
        patient: patientId,
        isReminderFollowup: true
    })
    .sort({ conversationDate: -1 })
    .limit(1)
    .lean();
    
    if (!conversations.length || !conversations[0].messages) {
        return [];
    }
    
    // Get recent messages from today's conversation
    const recentMessages = conversations[0].messages
        .slice(-limit * 2)
        .map(msg => ({
            role: msg.direction === 'inbound' ? 'user' : 'assistant',
            content: msg.body
        }));
    
    return recentMessages;
};

// Static method: Check if reminder already sent
messageSchema.statics.hasReminderBeenSent = async function(appointmentId, conversationType) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const conversation = await this.findOne({
        appointment: appointmentId,
        conversationType: conversationType,
        conversationDate: today,
        'messages.direction': 'outbound',
        isReminderFollowup: true
    });
    
    return !!conversation;
};

// Instance method: Add message to conversation
messageSchema.methods.addMessage = function(messageData) {
    this.messages.push({
        messageSid: messageData.messageSid,
        from: messageData.from,
        to: messageData.to,
        body: messageData.body,
        direction: messageData.direction,
        status: messageData.status || (messageData.direction === 'inbound' ? 'received' : 'sent'),
        timestamp: new Date(),
        aiProcessed: messageData.aiProcessed || false,
        intent: messageData.intent,
        confidence: messageData.confidence,
        errorCode: messageData.errorCode,
        errorMessage: messageData.errorMessage
    });
    
    this.messageCount = this.messages.length;
    this.lastMessageAt = new Date();
    
    return this.save();
};

// Instance method: Add function call to last message
messageSchema.methods.addFunctionCallToLastMessage = function(name, args, result) {
    if (this.messages.length === 0) {
        throw new Error('No messages in conversation');
    }
    
    const lastMessage = this.messages[this.messages.length - 1];
    
    if (!lastMessage.functionCalls) {
        lastMessage.functionCalls = [];
    }
    
    lastMessage.functionCalls.push({
        name,
        arguments: JSON.stringify(args),
        result,
        timestamp: new Date()
    });
    
    return this.save();
};

// Instance method: Mark conversation as completed
messageSchema.methods.complete = function() {
    this.conversationStatus = 'completed';
    return this.save();
};

// Instance method: Mark conversation as escalated
messageSchema.methods.escalate = function() {
    this.conversationStatus = 'escalated';
    return this.save();
};

// Pre-save middleware
messageSchema.pre('save', function(next) {
    // Clean phone numbers in messages
    this.messages.forEach(msg => {
        if (msg.from && !msg.from.startsWith('whatsapp:') && this.method === 'whatsapp') {
            msg.from = `whatsapp:${msg.from}`;
        }
        if (msg.to && !msg.to.startsWith('whatsapp:') && this.method === 'whatsapp') {
            msg.to = `whatsapp:${msg.to}`;
        }
    });
    
    // Auto-expire old active conversations
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (this.conversationStatus === 'active' && this.lastMessageAt < twentyFourHoursAgo) {
        this.conversationStatus = 'expired';
    }
    
    next();
});

const Message = mongoose.model('Message', messageSchema);

export default Message;