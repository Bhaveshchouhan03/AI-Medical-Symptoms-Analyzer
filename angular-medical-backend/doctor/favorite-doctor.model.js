const mongoose = require('mongoose');

const favoriteDoctorSchema = new mongoose.Schema(
  {
    patientId: {
      type: String, // String UUID pattern matching patient IDs
      required: true,
      index: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true
    }
  },
  {
    timestamps: true,
    collection: 'favorite_doctors'
  }
);

favoriteDoctorSchema.index({ patientId: 1, doctorId: 1 }, { unique: true });

module.exports = mongoose.model('FavoriteDoctor', favoriteDoctorSchema);
