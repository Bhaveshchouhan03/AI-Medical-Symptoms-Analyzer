const mongoose = require('mongoose');

const patientFormSchema = new mongoose.Schema(
  {
    // Stored as String because the auth system uses crypto.randomUUID()
    // (not MongoDB ObjectIds). Change to ObjectId when auth is migrated to MongoDB.
    userId: {
      type: String,
      default: null,
    },

    // Basic info
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [0, 'Age cannot be negative'],
      max: [120, 'Age cannot exceed 120'],
    },

    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: {
        values: ['male', 'female', 'other'],
        message: 'Gender must be male, female, or other',
      },
    },

    // Array of selected symptom strings
    symptoms: {
      type: [String],
      required: [true, 'At least one symptom is required'],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'At least one symptom must be selected',
      },
    },

    duration: {
      type: String,
      required: [true, 'Duration is required'],
      trim: true,
    },

    severity: {
      type: Number,
      required: [true, 'Severity is required'],
      min: [1, 'Severity must be between 1 and 10'],
      max: [10, 'Severity must be between 1 and 10'],
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },

    // Status for doctor review workflow
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved'],
      default: 'pending',
    },

    // AI analysis result from Gemini (saved after submission)
    aiAnalysis: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'patient_forms',
  }
);

patientFormSchema.index({ userId: 1, createdAt: -1 });
patientFormSchema.index({ status: 1 });

module.exports = mongoose.model('PatientForm', patientFormSchema);
