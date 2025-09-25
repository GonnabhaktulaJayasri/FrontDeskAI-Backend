import CallLog from "../models/CallLog.js";

export const getCallLogs = async (req, res) => {
    try {
        const { patient_id, fromDate, toDate, actionTaken, page = 1, limit = 10 } = req.query;

        const query = {};
        if (patient_id) query.patient = patient_id;
        if (actionTaken) query.actionTaken = actionTaken;

        // Optional date range filter
        if (fromDate || toDate) {
            query.startTime = {};
            if (fromDate) query.startTime.$gte = new Date(fromDate);
            if (toDate) query.startTime.$lte = new Date(toDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const callLogs = await CallLog.find(query)
            .populate("patient", "name phone")
            .sort({ startTime: -1 }) // newest first
            .skip(skip)
            .limit(parseInt(limit));

        const totalCount = await CallLog.countDocuments(query);

        res.status(200).json({
            success: true,
            totalCount,
            page: parseInt(page),
            totalPages: Math.ceil(totalCount / parseInt(limit)),
            callLogs: callLogs.map(log => ({
                id: log._id,
                patient: log.patient,
                callSid: log.callSid,
                from: log.from,
                to: log.to,
                type:log.type,
                startTime: log.startTime,
                endTime: log.endTime,
                duration: log.duration,
                transcript: log.transcript,
                actionTaken: log.actionTaken,
                entities: log.entities,
                intent: log.intent,
                createdAt: log.createdAt,
                updatedAt: log.updatedAt,
            })),
        });
    } catch (error) {
        console.error("Error fetching call logs:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching call logs",
            error: error.message
        });
    }
};
