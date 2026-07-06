const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
  getAllHospitals,
  addHospital,
  editHospital,
  deleteHospital,
} = require('./hospital.controller');

// Role checks
const verifyAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
  next();
};

// GET is public for authenticated users (patients, doctors, admins)
router.get('/', verifyToken, getAllHospitals);

// Admin-only endpoints
router.post('/', verifyToken, verifyAdmin, addHospital);
router.put('/:id', verifyToken, verifyAdmin, editHospital);
router.delete('/:id', verifyToken, verifyAdmin, deleteHospital);

module.exports = router;
