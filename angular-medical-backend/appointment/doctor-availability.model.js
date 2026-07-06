const mongoose = require('mongoose');

const doctorAvailabilitySchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      unique: true
    },
    busySlots: [
      {
        date: { type: String }, // YYYY-MM-DD
        time: { type: String }  // e.g. "09:00 AM"
      }
    ],
    customAvailability: [
      {
        day: { type: String },  // Monday, Tuesday, etc.
        slots: [{ type: String }] // Array of times
      }
    ]
  },
  {
    timestamps: true,
    collection: 'doctor_availabilities'
  }
);

module.exports = mongoose.model('DoctorAvailability', doctorAvailabilitySchema);
