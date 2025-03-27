
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const Joi = require('joi');
const { ROLES, LANGUAGES, PASSWORD_MIN_LENGTH } = require('../constants');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(PASSWORD_MIN_LENGTH).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  language: Joi.string().valid(...LANGUAGES).default('en')
});

// Register
exports.register = async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
    if (error) return res.status(400).json({ success: false, message: error.details.map(d => d.message).join(', ') });

    const { email, password, firstName, lastName, language } = value;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ success: false, message: 'User already exists' });

    const user = new User({ email, password, firstName, lastName, language });
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({ success: true, token, user });
  } catch (error) {
    logger.error('Registration error:', error);
    next(error);
  }
};

// Login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({ success: true, token, user });
  } catch (error) {
    logger.error('Login error:', error);
    next(error);
  }
};

// Profile
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, language } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (language) user.language = language;

    await user.save();
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// Admin: Get all users
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

// Admin: Delete user
exports.deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    if (userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    const deleted = await User.findByIdAndDelete(userId);
    if (!deleted) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    next(error);
  }
};

// Admin: Change role
exports.changeUserRole = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;
    if (!ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.role = role;
    await user.save();

    res.json({ success: true, message: 'Role updated', user });
  } catch (error) {
    next(error);
  }
};


// Admin: Register another admin
exports.registerAdmin = async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
    if (error) return res.status(400).json({ success: false, message: error.details.map(d => d.message).join(', ') });

    const { email, password, firstName, lastName, language } = value;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ success: false, message: 'User already exists' });

    const user = new User({ email, password, firstName, lastName, language, role: 'Admin' });
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({ success: true, token, user });
  } catch (error) {
    next(error);
  }
};
