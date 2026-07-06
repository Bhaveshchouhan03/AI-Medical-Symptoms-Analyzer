const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
  getAllDoctors,
  getDoctorById,
  addDoctor,
  editDoctor,
  deleteDoctor,
  toggleDoctorStatus,
  registerDoctor,
  loginDoctor,
  addReviewAndRating,
  getDoctorReviews,
  toggleFavoriteDoctor,
  getMyFavorites,
  updateAvailability,
} = require('./doctor.controller');

// Middleware to restrict access to Admins only
const verifyAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
  next();
};

// Public registration and login
router.post('/register', registerDoctor);
router.post('/login', loginDoctor);

// GET endpoints (available to authenticated users)
router.get('/favorites/my', verifyToken, getMyFavorites);
router.put('/availability', verifyToken, updateAvailability);
router.get('/', verifyToken, getAllDoctors);
router.get('/:id', verifyToken, getDoctorById);
router.get('/:id/reviews', verifyToken, getDoctorReviews);

// Action endpoints (authenticated users)
router.post('/:id/reviews', verifyToken, addReviewAndRating);
router.post('/:id/favorite', verifyToken, toggleFavoriteDoctor);

// Admin-only endpoints
router.post('/', verifyToken, verifyAdmin, addDoctor);
router.put('/:id', verifyToken, verifyAdmin, editDoctor);
router.delete('/:id', verifyToken, verifyAdmin, deleteDoctor);
router.patch('/:id/status', verifyToken, verifyAdmin, toggleDoctorStatus);

module.exports = router;
