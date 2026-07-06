const mongoose = require('mongoose');

const doctorNoteSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      index: true
    },
    patientId: {
      type: String,
      required: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true
    },
    notes: {
      type: String,
      default: ''
    },
    prescriptionNotes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true,
    collection: 'doctor_notes'
  }
);

module.exports = mongoose.model('DoctorNote', doctorNoteSchema);
