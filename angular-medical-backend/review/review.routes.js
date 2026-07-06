const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { getDoctorReviews, addReview } = require('./review.controller');

// Role checks
const verifyPatient = (req, res, next) => {
  if (!req.user || req.user.role !== 'patient') {
    return res.status(403).json({ message: 'Access denied. Patient role required.' });
  }
  next();
};

// GET is public for authenticated users
router.get('/doctor/:doctorId', verifyToken, getDoctorReviews);

// POST is for patient users only
router.post('/', verifyToken, verifyPatient, addReview);

module.exports = router;
