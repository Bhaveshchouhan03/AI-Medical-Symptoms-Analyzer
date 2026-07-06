const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Hospital name is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    collection: 'hospitals',
  }
);

hospitalSchema.index({ city: 1 });

module.exports = mongoose.model('Hospital', hospitalSchema);
