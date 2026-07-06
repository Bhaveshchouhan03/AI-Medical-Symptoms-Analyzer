const mongoose = require('mongoose');

const appointmentHistorySchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      index: true
    },
    status: {
      type: String,
      required: true
    },
    notes: {
      type: String,
      default: ''
    },
    updatedBy: {
      type: String, // 'doctor', 'patient', or 'system'
      required: true
    }
  },
  {
    timestamps: true,
    collection: 'appointment_histories'
  }
);

module.exports = mongoose.model('AppointmentHistory', appointmentHistorySchema);
