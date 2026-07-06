const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    medicineName: {
      type: String,
      required: [true, 'Medicine Name is required'],
      unique: true,
      trim: true,
    },
    genericName: {
      type: String,
      required: [true, 'Generic Name is required'],
      trim: true,
    },
    brandName: {
      type: String,
      required: [true, 'Brand Name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: [
          'Pain Relief',
          'Antibiotics',
          'Vitamins',
          'Diabetes',
          'Blood Pressure',
          'Cold & Flu',
          'Skin Care',
          'Digestive Health',
          'Heart Medicines',
          'Respiratory',
          'Eye Care'
        ],
        message: '{VALUE} is not a valid category',
      },
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    uses: {
      type: [String],
      default: [],
    },
    sideEffects: {
      type: [String],
      default: [],
    },
    warnings: {
      type: [String],
      default: [],
    },
    precautions: {
      type: [String],
      default: [],
    },
    howItWorks: {
      type: String,
      trim: true,
      default: '',
    },
    pregnancySafety: {
      type: String,
      trim: true,
      default: 'Consult doctor before use',
    },
    breastfeedingSafety: {
      type: String,
      trim: true,
      default: 'Consult doctor before use',
    },
    drivingWarning: {
      type: String,
      trim: true,
      default: 'No specific restriction',
    },
    alcoholWarning: {
      type: String,
      trim: true,
      default: 'Avoid alcohol while taking this medicine',
    },
    foodInteractions: {
      type: String,
      trim: true,
      default: 'No specific interaction',
    },
    drugInteractions: {
      type: String,
      trim: true,
      default: 'No specific interaction',
    },
    storageInstructions: {
      type: String,
      trim: true,
      default: 'Store in a cool, dry place away from sunlight',
    },
    expiryInfo: {
      type: String,
      trim: true,
      default: 'Check packaging label',
    },
    prescriptionRequired: {
      type: Boolean,
      default: false,
    },
    manufacturer: {
      type: String,
      trim: true,
      default: 'Generic Lab Inc.',
    },
    availableStrengths: {
      type: [String],
      default: [],
    },
    availableForms: {
      type: [String],
      default: [],
    },
    image: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    collection: 'medicines',
  }
);

medicineSchema.index({ medicineName: 1 });
medicineSchema.index({ category: 1 });
medicineSchema.index({ genericName: 1 });

module.exports = mongoose.model('Medicine', medicineSchema);
