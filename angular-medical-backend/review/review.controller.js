const Review = require('./review.model');
const Doctor = require('../doctor/doctor.model');
const { getAllUsers } = require('../data/users.store');

// GET /api/reviews/doctor/:doctorId
const getDoctorReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ doctorId: req.params.doctorId })
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ count: reviews.length, data: reviews });
  } catch (error) {
    console.error('[getDoctorReviews] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/reviews
const addReview = async (req, res) => {
  try {
    const { doctorId, rating, reviewText } = req.body;
    if (!doctorId || !rating) {
      return res.status(400).json({ message: 'Doctor ID and Rating are required' });
    }

    // Check if doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Get patient details from req.user
    const patientUser = getAllUsers().find((u) => u.id === req.user.id);
    const firstName = patientUser ? patientUser.firstName : (req.user.firstName || 'Patient');
    const lastName = patientUser ? patientUser.lastName : (req.user.lastName || '');
    const patientName = `${firstName} ${lastName}`.trim();

    const review = new Review({
      doctorId,
      patientName,
      rating: Number(rating),
      reviewText: reviewText || '',
    });

    const saved = await review.save();

    // Re-calculate doctor rating average
    const allReviews = await Review.find({ doctorId });
    if (allReviews.length > 0) {
      const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      doctor.rating = Math.round(avg * 10) / 10; // e.g. 4.8
      await doctor.save();
    }

    return res.status(201).json({ message: 'Review added successfully', data: saved });
  } catch (error) {
    console.error('[addReview] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getDoctorReviews,
  addReview,
};
