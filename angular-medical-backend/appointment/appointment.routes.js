const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
  bookAppointment,
  rescheduleAppointment,
  getPatientAppointments,
  cancelAppointment,
  getDoctorAppointments,
  updateAppointmentStatus,
  getAllAppointments,
  getAnalytics,
  getAppointmentDetails,
  acceptAppointment,
  rejectAppointment,
  rescheduleAppointmentNew,
  completeAppointment,
  cancelAppointmentNew,
  suggestSlots,
  respondToRejection,
  markEmergency,
  getMyNotifications,
  markNotificationRead,
} = require('./appointment.controller');

// Role checks middleware
const verifyPatient = (req, res, next) => {
  if (!req.user || req.user.role !== 'patient') {
    return res.status(403).json({ message: 'Access denied. Patient role required.' });
  }
  next();
};

const verifyDoctor = (req, res, next) => {
  if (!req.user || req.user.role !== 'doctor') {
    return res.status(403).json({ message: 'Access denied. Doctor role required.' });
  }
  next();
};

const verifyAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
  next();
};

// Patient-specific endpoints
router.post('/', verifyToken, verifyPatient, bookAppointment);
router.get('/my', verifyToken, verifyPatient, getPatientAppointments);
router.patch('/:id/cancel', verifyToken, verifyPatient, cancelAppointment);
router.patch('/:id/reschedule', verifyToken, verifyPatient, rescheduleAppointment);
router.post('/:id/respond-reject', verifyToken, verifyPatient, respondToRejection);

// Doctor-specific endpoints
router.get('/doctor', verifyToken, verifyDoctor, getDoctorAppointments);
router.patch('/:id/status', verifyToken, verifyDoctor, updateAppointmentStatus);
router.post('/:id/accept', verifyToken, verifyDoctor, acceptAppointment);
router.post('/:id/reject', verifyToken, verifyDoctor, rejectAppointment);
router.post('/:id/complete', verifyToken, verifyDoctor, completeAppointment);
router.post('/:id/suggest-slots', verifyToken, verifyDoctor, suggestSlots);
router.post('/:id/emergency', verifyToken, verifyDoctor, markEmergency);

// Notifications
router.get('/notifications/my', verifyToken, getMyNotifications);
router.patch('/notifications/:id/read', verifyToken, markNotificationRead);

// Shared endpoints (reschedule/cancel access)
router.get('/:id/details', verifyToken, getAppointmentDetails);
router.post('/:id/reschedule', verifyToken, rescheduleAppointmentNew);
router.post('/:id/cancel', verifyToken, cancelAppointmentNew);

// Admin-specific endpoints
router.get('/all', verifyToken, verifyAdmin, getAllAppointments);
router.get('/analytics', verifyToken, verifyAdmin, getAnalytics);

module.exports = router;
