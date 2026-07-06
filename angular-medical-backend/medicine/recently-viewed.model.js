const mongoose = require('mongoose');

const recentlyViewedSchema = new mongoose.Schema(
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
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'medicine_recently_viewed',
  }
);

recentlyViewedSchema.index({ userId: 1, medicineId: 1 }, { unique: true });
recentlyViewedSchema.index({ userId: 1, viewedAt: -1 });

module.exports = mongoose.model('RecentlyViewed', recentlyViewedSchema);
