const Medicine = require('./medicine.model');
const Bookmark = require('./bookmark.model');
const RecentlyViewed = require('./recently-viewed.model');
const mongoose = require('mongoose');

// GET /api/medicines
// Query parameters: search, category, page, limit
const getAllMedicines = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 6 } = req.query;
    const query = {};

    if (category) {
      query.category = category;
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { medicineName: searchRegex },
        { brandName: searchRegex },
        { genericName: searchRegex },
        { description: searchRegex },
        { uses: searchRegex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const total = await Medicine.countDocuments(query);
    const medicines = await Medicine.find(query)
      .sort({ medicineName: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    return res.status(200).json({
      count: total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: medicines,
    });
  } catch (error) {
    console.error('[getAllMedicines] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/medicines/stats
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;

    // 1. Total Medicines
    const totalMedicines = await Medicine.countDocuments();

    // 2. Total Categories
    const categoriesList = await Medicine.distinct('category');
    const totalCategories = categoriesList.length;

    // 3. Most Bookmarked Medicines (Aggregated)
    const topBookmarks = await Bookmark.aggregate([
      { $group: { _id: '$medicineId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 4 },
    ]);

    let mostSearched = [];
    if (topBookmarks.length > 0) {
      const ids = topBookmarks.map((tb) => tb._id);
      mostSearched = await Medicine.find({ _id: { $in: ids } }).lean();
    } else {
      // Fallback if no bookmarks exist yet
      mostSearched = await Medicine.find().limit(4).lean();
    }

    // 4. Recently Viewed for the current user
    let recentlyViewed = [];
    if (userId) {
      const rvList = await RecentlyViewed.find({ userId })
        .sort({ viewedAt: -1 })
        .limit(4)
        .populate('medicineId')
        .lean();
      
      recentlyViewed = rvList
        .filter((item) => item.medicineId)
        .map((item) => item.medicineId);
    }

    return res.status(200).json({
      data: {
        totalMedicines,
        totalCategories,
        mostSearched,
        recentlyViewed,
      },
    });
  } catch (error) {
    console.error('[getDashboardStats] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/medicines/:id
const getMedicineById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid medicine ID format' });
    }

    const medicine = await Medicine.findById(id).lean();
    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found' });
    }

    // Track recently viewed if user is logged in
    if (req.user && req.user.id) {
      await RecentlyViewed.findOneAndUpdate(
        { userId: req.user.id, medicineId: id },
        { viewedAt: new Date() },
        { upsert: true, new: true }
      );
    }

    return res.status(200).json({ data: medicine });
  } catch (error) {
    console.error('[getMedicineById] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/medicines/:id/bookmark
// Toggles bookmark status
const toggleBookmark = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid medicine ID format' });
    }

    const medicine = await Medicine.findById(id);
    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found' });
    }

    const existing = await Bookmark.findOne({ userId, medicineId: id });
    if (existing) {
      await Bookmark.deleteOne({ _id: existing._id });
      return res.status(200).json({ bookmarked: false, message: 'Removed from bookmarks' });
    } else {
      await Bookmark.create({ userId, medicineId: id });
      return res.status(200).json({ bookmarked: true, message: 'Added to bookmarks' });
    }
  } catch (error) {
    console.error('[toggleBookmark] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/medicines/user/bookmarks
const getBookmarkedMedicines = async (req, res) => {
  try {
    const userId = req.user.id;
    const bookmarks = await Bookmark.find({ userId })
      .populate('medicineId')
      .lean();

    const medicines = bookmarks
      .filter((b) => b.medicineId)
      .map((b) => b.medicineId);

    return res.status(200).json({ count: medicines.length, data: medicines });
  } catch (error) {
    console.error('[getBookmarkedMedicines] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/medicines/user/recently-viewed
const getRecentlyViewedMedicines = async (req, res) => {
  try {
    const userId = req.user.id;
    const rvList = await RecentlyViewed.find({ userId })
      .sort({ viewedAt: -1 })
      .limit(6)
      .populate('medicineId')
      .lean();

    const medicines = rvList
      .filter((rv) => rv.medicineId)
      .map((rv) => rv.medicineId);

    return res.status(200).json({ count: medicines.length, data: medicines });
  } catch (error) {
    console.error('[getRecentlyViewedMedicines] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getAllMedicines,
  getDashboardStats,
  getMedicineById,
  toggleBookmark,
  getBookmarkedMedicines,
  getRecentlyViewedMedicines,
};
