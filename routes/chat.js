const mongoose = require('mongoose')

const chatSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    messages: [{
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        text: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
})

module.exports = mongoose.model('Chat', chatSchema)