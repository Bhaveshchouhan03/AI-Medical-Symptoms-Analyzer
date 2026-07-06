const mongoose = require('mongoose');

const rescheduleRequestSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      index: true
    },
    suggestedBy: {
      type: String, // 'doctor' or 'patient'
      required: true
    },
    reason: {
      type: String,
      default: ''
    },
    originalDate: {
      type: String,
      required: true
    },
    originalTime: {
      type: String,
      required: true
    },
    suggestedDate: {
      type: String,
      required: true
    },
    suggestedTime: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected'],
      default: 'Pending'
    }
  },
  {
    timestamps: true,
    collection: 'reschedule_requests'
  }
);

module.exports = mongoose.model('RescheduleRequest', rescheduleRequestSchema);
