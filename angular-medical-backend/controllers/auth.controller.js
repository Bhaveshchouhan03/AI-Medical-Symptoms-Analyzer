const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/jwt.utils');
const { findByEmail, findById, createUser } = require('../data/users.store');

// POST /api/auth/signup
const signup = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if user already exists
    const existingUser = findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = {
      id: crypto.randomUUID(),
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'patient',
      createdAt: new Date().toISOString(),
    };

    createUser(newUser);

    // Generate tokens
    const tokenPayload = { id: newUser.id, email: newUser.email, role: newUser.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return res.status(201).json({
      message: 'Account created successfully',
      accessToken,
      refreshToken,
      user: {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    let user = findByEmail(email);
    let isDoctor = false;

    if (!user) {
      // Check if user is a doctor in MongoDB
      const Doctor = require('../doctor/doctor.model');
      const doctorDoc = await Doctor.findOne({ email: email.toLowerCase() });
      if (!doctorDoc) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      user = {
        id: doctorDoc._id.toString(),
        firstName: doctorDoc.fullName.split(' ')[0] || 'Doctor',
        lastName: doctorDoc.fullName.split(' ').slice(1).join(' ') || '',
        email: doctorDoc.email,
        password: doctorDoc.password,
        role: 'doctor',
      };
      isDoctor = true;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const tokenPayload = { id: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return res.status(200).json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/auth/refresh
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    const decoded = verifyToken(token);
    let user = findById(decoded.id);

    if (!user) {
      // Check if doctor
      const Doctor = require('../doctor/doctor.model');
      const doctorDoc = await Doctor.findById(decoded.id).lean();
      if (!doctorDoc) {
        return res.status(401).json({ message: 'User not found' });
      }
      user = {
        id: doctorDoc._id.toString(),
        email: doctorDoc.email,
        role: 'doctor',
      };
    }

    const tokenPayload = { id: user.id, email: user.email, role: user.role };
    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    return res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

// GET /api/auth/me  (protected route)
const getMe = async (req, res) => {
  try {
    let user = findById(req.user.id);
    if (!user) {
      // Check if doctor in MongoDB
      const Doctor = require('../doctor/doctor.model');
      const doctorDoc = await Doctor.findById(req.user.id).lean();
      if (!doctorDoc) {
        return res.status(404).json({ message: 'User not found' });
      }
      user = {
        id: doctorDoc._id.toString(),
        firstName: doctorDoc.fullName.split(' ')[0] || 'Doctor',
        lastName: doctorDoc.fullName.split(' ').slice(1).join(' ') || '',
        email: doctorDoc.email,
        role: 'doctor',
        createdAt: doctorDoc.createdAt,
      };
    }

    return res.status(200).json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { signup, login, refreshToken, getMe };
