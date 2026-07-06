const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
    },
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: [true, 'Medicine ID is required'],
    },
  },
  {
    timestamps: true,
    collection: 'medicine_bookmarks',
  }
);

bookmarkSchema.index({ userId: 1, medicineId: 1 }, { unique: true });

module.exports = mongoose.model('Bookmark', bookmarkSchema);
