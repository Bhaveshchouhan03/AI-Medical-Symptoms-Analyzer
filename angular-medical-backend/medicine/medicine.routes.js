const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
  getAllMedicines,
  getDashboardStats,
  getMedicineById,
  toggleBookmark,
  getBookmarkedMedicines,
  getRecentlyViewedMedicines,
} = require('./medicine.controller');

// All medicine endpoints require token verification
router.get('/stats', verifyToken, getDashboardStats);
router.get('/user/bookmarks', verifyToken, getBookmarkedMedicines);
router.get('/user/recently-viewed', verifyToken, getRecentlyViewedMedicines);

router.get('/', verifyToken, getAllMedicines);
router.get('/:id', verifyToken, getMedicineById);
router.post('/:id/bookmark', verifyToken, toggleBookmark);

module.exports = router;
