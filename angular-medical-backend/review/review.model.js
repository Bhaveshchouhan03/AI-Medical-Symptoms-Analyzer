const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor ID reference is required'],
    },
    patientName: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    reviewText: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    collection: 'reviews',
  }
);

reviewSchema.index({ doctorId: 1 });

module.exports = mongoose.model('Review', reviewSchema);
