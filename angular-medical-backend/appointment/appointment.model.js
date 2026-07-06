const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: String, // Stored as String to support UUIDs from in-memory store
      required: [true, 'Patient ID is required'],
    },
    patientName: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
    },
    patientEmail: {
      type: String,
      required: [true, 'Patient email is required'],
      lowercase: true,
      trim: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor reference is required'],
    },
    doctorName: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true,
    },
    doctorSpecialization: {
      type: String,
      required: [true, 'Doctor specialization is required'],
      trim: true,
    },
    appointmentDate: {
      type: String, // Formatted as YYYY-MM-DD
      required: [true, 'Appointment date is required'],
    },
    appointmentTime: {
      type: String, // Formatted as e.g. "09:00 AM"
      required: [true, 'Appointment time is required'],
    },
    reasonForVisit: {
      type: String,
      required: [true, 'Reason for visit is required'],
      trim: true,
    },
    symptoms: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected', 'Completed', 'Cancelled', 'Rescheduled', 'Emergency'],
      default: 'Pending',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    suggestedTimeSlots: {
      type: [String],
      default: [],
    },
    isEmergency: {
      type: Boolean,
      default: false,
    },
    prescriptionNotes: {
      type: String,
      default: '',
    },
    reportUrl: {
      type: String,
      default: '',
    },
    videoLink: {
      type: String,
      default: '',
    },
    clinicAddress: {
      type: String,
      default: '',
    },
    hospitalName: {
      type: String,
      default: '',
    },
    timeline: [
      {
        status: { type: String },
        notes: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now }
      }
    ],
  },
  {
    timestamps: true,
    collection: 'appointments',
  }
);

appointmentSchema.index({ patientId: 1, appointmentDate: -1 });
appointmentSchema.index({ doctorId: 1, appointmentDate: -1 });
appointmentSchema.index({ status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
