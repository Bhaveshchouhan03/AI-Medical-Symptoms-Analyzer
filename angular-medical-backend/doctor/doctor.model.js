const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full Name is required'],
      trim: true,
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      enum: {
        values: [
          'General Physician',
          'Dermatologist',
          'Neurologist',
          'Ophthalmologist',
          'Orthopedic',
          'Cardiologist',
          'Psychiatrist',
          'Dentist',
          'ENT Specialist',
        ],
        message: '{VALUE} is not a supported specialization',
      },
      trim: true,
    },
    qualification: {
      type: String,
      required: [true, 'Qualification is required'],
      trim: true,
    },
    experience: {
      type: Number,
      required: [true, 'Experience is required'],
      min: [0, 'Experience cannot be negative'],
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
    },
    hospitalName: {
      type: String,
      required: [true, 'Hospital/Clinic Name is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    languages: {
      type: [String],
      default: ['English'],
    },
    consultationFee: {
      type: Number,
      required: [true, 'Consultation fee is required'],
      min: [0, 'Fee cannot be negative'],
    },
    rating: {
      type: Number,
      min: [0, 'Rating cannot be below 0'],
      max: [5, 'Rating cannot exceed 5'],
      default: 5.0,
    },
    profileImage: {
      type: String,
      default: '',
    },
    about: {
      type: String,
      trim: true,
      default: '',
    },
    availableDays: {
      type: [String],
      required: [true, 'Available days are required'],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'At least one available day is required',
      },
    },
    availableTimeSlots: {
      type: [String],
      required: [true, 'Available time slots are required'],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'At least one available time slot is required',
      },
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    gender: {
      type: String,
      default: '',
    },
    age: {
      type: Number,
      default: 35,
    },
    medicalDegree: {
      type: String,
      default: 'M.B.B.S.',
    },
    registrationNumber: {
      type: String,
      default: '',
    },
    clinicName: {
      type: String,
      default: '',
    },
    onlineConsultation: {
      type: Boolean,
      default: true,
    },
    offlineConsultation: {
      type: Boolean,
      default: true,
    },
    clinicAddress: {
      type: String,
      default: '',
    },
    state: {
      type: String,
      default: '',
    },
    country: {
      type: String,
      default: '',
    },
    googleMapsLocation: {
      type: String,
      default: '',
    },
    achievements: {
      type: [String],
      default: [],
    },
    certificates: {
      type: [String],
      default: [],
    },
    maxPatientsPerDay: {
      type: Number,
      default: 30,
    },
    emergencyAvailability: {
      type: Boolean,
      default: false,
    },
    verificationStatus: {
      type: String,
      enum: ['Pending', 'Verified', 'Rejected'],
      default: 'Verified',
    },
    reviewsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'doctors',
  }
);

doctorSchema.index({ email: 1 });
doctorSchema.index({ specialization: 1, status: 1 });
doctorSchema.index({ city: 1 });

module.exports = mongoose.model('Doctor', doctorSchema);
