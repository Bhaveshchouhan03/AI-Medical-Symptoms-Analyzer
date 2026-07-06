const bcrypt = require('bcryptjs');
const Doctor = require('./doctor.model');
const FavoriteDoctor = require('./favorite-doctor.model');
const mongoose = require('mongoose');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt.utils');

const getDayName = (dateStr) => {
  const date = new Date(dateStr);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
};

// GET /api/doctors
const getAllDoctors = async (req, res) => {
  try {
    const { 
      name, 
      specialization, 
      hospitalName, 
      city, 
      experience, 
      consultationFee, 
      status, 
      online, 
      offline, 
      availableToday, 
      rating, 
      language 
    } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    } else if (req.user && (req.user.role === 'admin' || req.user.role === 'doctor')) {
      // Admin or doctor requests
    } else {
      query.status = 'Active';
    }

    if (name) {
      query.fullName = { $regex: name, $options: 'i' };
    }
    if (specialization) {
      query.specialization = specialization;
    }
    if (hospitalName) {
      query.hospitalName = { $regex: hospitalName, $options: 'i' };
    }
    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }
    if (experience) {
      query.experience = { $gte: Number(experience) };
    }
    if (consultationFee) {
      query.consultationFee = { $lte: Number(consultationFee) };
    }
    if (online === 'true') {
      query.onlineConsultation = true;
    }
    if (offline === 'true') {
      query.offlineConsultation = true;
    }
    if (availableToday === 'true') {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayDay = getDayName(todayStr);
      query.availableDays = todayDay;
    }
    if (rating) {
      query.rating = { $gte: Number(rating) };
    }
    if (language) {
      query.languages = { $regex: language, $options: 'i' };
    }

    const doctors = await Doctor.find(query).sort({ fullName: 1 }).lean();
    return res.status(200).json({ count: doctors.length, data: doctors });
  } catch (error) {
    console.error('[getAllDoctors] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/doctors/:id
const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).lean();
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    return res.status(200).json({ data: doctor });
  } catch (error) {
    console.error('[getDoctorById] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/doctors (Admin only)
const addDoctor = async (req, res) => {
  try {
    const {
      fullName,
      specialization,
      qualification,
      experience,
      hospitalId,
      hospitalName,
      city,
      languages,
      consultationFee,
      rating,
      profileImage,
      about,
      availableDays,
      availableTimeSlots,
      email,
      phone,
      password,
    } = req.body;

    const existing = await Doctor.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password || 'doctor123', salt);

    const doctor = new Doctor({
      fullName,
      specialization,
      qualification,
      experience: Number(experience),
      hospitalId: hospitalId || null,
      hospitalName,
      city,
      languages: languages || ['English'],
      consultationFee: Number(consultationFee),
      rating: rating ? Number(rating) : 5.0,
      profileImage: profileImage || '',
      about: about || '',
      availableDays,
      availableTimeSlots,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      status: 'Active',
    });

    const saved = await doctor.save();
    return res.status(201).json({
      message: 'Doctor added successfully',
      data: saved,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    console.error('[addDoctor] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PUT /api/doctors/:id (Admin only)
const editDoctor = async (req, res) => {
  try {
    const {
      fullName,
      specialization,
      qualification,
      experience,
      hospitalId,
      hospitalName,
      city,
      languages,
      consultationFee,
      profileImage,
      about,
      availableDays,
      availableTimeSlots,
      email,
      phone,
      password,
    } = req.body;

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    if (email && email.toLowerCase() !== doctor.email.toLowerCase()) {
      const existing = await Doctor.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(409).json({ message: 'Email is already registered' });
      }
      doctor.email = email.toLowerCase();
    }

    if (fullName) doctor.fullName = fullName;
    if (specialization) doctor.specialization = specialization;
    if (qualification) doctor.qualification = qualification;
    if (experience !== undefined) doctor.experience = Number(experience);
    if (hospitalId !== undefined) doctor.hospitalId = hospitalId || null;
    if (hospitalName) doctor.hospitalName = hospitalName;
    if (city) doctor.city = city;
    if (languages) doctor.languages = languages;
    if (consultationFee !== undefined) doctor.consultationFee = Number(consultationFee);
    if (profileImage !== undefined) doctor.profileImage = profileImage;
    if (about !== undefined) doctor.about = about;
    if (availableDays) doctor.availableDays = availableDays;
    if (availableTimeSlots) doctor.availableTimeSlots = availableTimeSlots;
    if (phone) doctor.phone = phone;

    if (password) {
      const salt = await bcrypt.genSalt(12);
      doctor.password = await bcrypt.hash(password, salt);
    }

    const saved = await doctor.save();
    return res.status(200).json({
      message: 'Doctor updated successfully',
      data: saved,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    console.error('[editDoctor] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE /api/doctors/:id (Admin only)
const deleteDoctor = async (req, res) => {
  try {
    const deleted = await Doctor.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    return res.status(200).json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    console.error('[deleteDoctor] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/doctors/:id/status (Admin only)
const toggleDoctorStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ message: 'Status must be Active or Inactive' });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    doctor.status = status;
    await doctor.save();

    return res.status(200).json({
      message: `Doctor status updated to ${status}`,
      data: doctor,
    });
  } catch (error) {
    console.error('[toggleDoctorStatus] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/doctors/register
const registerDoctor = async (req, res) => {
  try {
    const {
      fullName,
      specialization,
      qualification,
      experience,
      hospitalName,
      city,
      languages,
      consultationFee,
      availableDays,
      availableTimeSlots,
      email,
      phone,
      password,
      gender,
      age,
      medicalDegree,
      registrationNumber,
      clinicName,
      onlineConsultation,
      offlineConsultation,
      clinicAddress,
      state,
      country,
      googleMapsLocation,
      achievements,
      certificates,
      maxPatientsPerDay,
      emergencyAvailability,
    } = req.body;

    if (!fullName || !email || !password || !specialization || !qualification || !experience || !hospitalName || !city || !consultationFee || !availableDays || !availableTimeSlots) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    const existing = await Doctor.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const doctor = new Doctor({
      fullName,
      specialization,
      qualification,
      experience: Number(experience),
      hospitalName,
      city,
      languages: languages || ['English'],
      consultationFee: Number(consultationFee),
      availableDays,
      availableTimeSlots,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      status: 'Active',
      gender: gender || 'male',
      age: age ? Number(age) : 35,
      medicalDegree: medicalDegree || 'M.B.B.S.',
      registrationNumber: registrationNumber || '',
      clinicName: clinicName || '',
      onlineConsultation: onlineConsultation !== undefined ? onlineConsultation : true,
      offlineConsultation: offlineConsultation !== undefined ? offlineConsultation : true,
      clinicAddress: clinicAddress || '',
      state: state || '',
      country: country || '',
      googleMapsLocation: googleMapsLocation || '',
      achievements: achievements || [],
      certificates: certificates || [],
      maxPatientsPerDay: maxPatientsPerDay ? Number(maxPatientsPerDay) : 30,
      emergencyAvailability: emergencyAvailability !== undefined ? emergencyAvailability : false,
      verificationStatus: 'Verified',
      reviewsCount: 0,
      rating: 5.0
    });

    const saved = await doctor.save();
    
    // Generate JWT token
    const tokenPayload = { id: saved._id.toString(), email: saved.email, role: 'doctor' };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Create a new doctor availability registry
    const DoctorAvailability = require('../appointment/doctor-availability.model');
    await DoctorAvailability.create({
      doctorId: saved._id,
      busySlots: [],
      customAvailability: []
    }).catch(err => console.error('[registerDoctor availability creation error]:', err));

    return res.status(201).json({
      message: 'Doctor account registered successfully',
      accessToken,
      refreshToken,
      user: {
        id: saved._id.toString(),
        firstName: saved.fullName.split(' ')[0] || 'Doctor',
        lastName: saved.fullName.split(' ').slice(1).join(' ') || '',
        email: saved.email,
        role: 'doctor',
      },
      data: saved
    });
  } catch (error) {
    console.error('[registerDoctor] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/doctors/login
const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const doctor = await Doctor.findOne({ email: email.toLowerCase() });
    if (!doctor) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const tokenPayload = { id: doctor._id.toString(), email: doctor.email, role: 'doctor' };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return res.status(200).json({
      message: 'Logged in successfully',
      accessToken,
      refreshToken,
      user: {
        id: doctor._id.toString(),
        firstName: doctor.fullName.split(' ')[0] || 'Doctor',
        lastName: doctor.fullName.split(' ').slice(1).join(' ') || '',
        email: doctor.email,
        role: 'doctor',
      }
    });
  } catch (error) {
    console.error('[loginDoctor] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/doctors/:id/reviews
const addReviewAndRating = async (req, res) => {
  try {
    const { rating, reviewText } = req.body;
    const doctorId = req.params.id;

    if (!rating) {
      return res.status(400).json({ message: 'Rating is required' });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const Review = require('../review/review.model');
    const review = await Review.create({
      doctorId,
      patientName: req.user ? req.user.email.split('@')[0] : 'Anonymous Patient',
      rating: Number(rating),
      reviewText: reviewText || ''
    });

    const reviewsList = await Review.find({ doctorId });
    const totalReviews = reviewsList.length;
    const avgRating = reviewsList.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

    doctor.rating = Number(avgRating.toFixed(1));
    doctor.reviewsCount = totalReviews;
    await doctor.save();

    return res.status(201).json({
      message: 'Review and rating submitted successfully',
      review,
      avgRating: doctor.rating,
      reviewsCount: doctor.reviewsCount
    });
  } catch (error) {
    console.error('[addReviewAndRating] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/doctors/:id/reviews
const getDoctorReviews = async (req, res) => {
  try {
    const Review = require('../review/review.model');
    const reviews = await Review.find({ doctorId: req.params.id }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ count: reviews.length, data: reviews });
  } catch (error) {
    console.error('[getDoctorReviews] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/doctors/:id/favorite
const toggleFavoriteDoctor = async (req, res) => {
  try {
    const patientId = req.user.id;
    const doctorId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ message: 'Invalid doctor ID format' });
    }

    const fav = await FavoriteDoctor.findOne({ patientId, doctorId });
    if (fav) {
      await FavoriteDoctor.deleteOne({ _id: fav._id });
      return res.status(200).json({ isFavorite: false, message: 'Removed from favorites' });
    } else {
      await FavoriteDoctor.create({ patientId, doctorId });
      return res.status(200).json({ isFavorite: true, message: 'Added to favorites' });
    }
  } catch (error) {
    console.error('[toggleFavoriteDoctor] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/doctors/favorites/my
const getMyFavorites = async (req, res) => {
  try {
    const patientId = req.user.id;
    const favs = await FavoriteDoctor.find({ patientId }).populate('doctorId');
    const doctors = favs.map(f => f.doctorId).filter(d => d !== null);
    return res.status(200).json({ count: doctors.length, data: doctors });
  } catch (error) {
    console.error('[getMyFavorites] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PUT /api/doctors/availability
const updateAvailability = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { availableDays, availableTimeSlots } = req.body;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    if (availableDays) doctor.availableDays = availableDays;
    if (availableTimeSlots) doctor.availableTimeSlots = availableTimeSlots;

    await doctor.save();
    return res.status(200).json({ message: 'Schedule availability updated successfully', data: doctor });
  } catch (error) {
    console.error('[updateAvailability] error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
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
};
