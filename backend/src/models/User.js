/**
 * User.js — Mongoose Model for User Accounts
 *
 * This model stores login credentials and role information for
 * both HR users and Candidates. It uses bcrypt to securely
 * hash passwords before saving them to the database.
 *
 * Role-based access:
 *   - 'HR'        → can post jobs, view/rank candidates, update status
 *   - 'CANDIDATE' → can browse jobs, apply, upload resume, view own applications
 *
 * Relationships:
 *   - One User → One Candidate profile (stored in Candidate collection)
 *   - One User (HR) → Many Jobs (stored in Job collection)
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs'); // bcrypt — for securely hashing passwords

const userSchema = new mongoose.Schema({

  // Full name of the user (used for display purposes)
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true  // removes leading/trailing whitespace automatically
  },

  // Email address — also used as the login username
  // 'unique: true' prevents two accounts with the same email
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true  // automatically converts to lowercase before saving
  },

  // Password is stored as a bcrypt hash, never as plain text
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false  // 'select: false' means password is NOT returned in queries by default (security)
  },

  // Phone number (optional field)
  phone: {
    type: String,
    trim: true
  },

  // Role determines what the user can access in the system
  // 'HR' — recruitment managers
  // 'CANDIDATE' — job applicants
  role: {
    type: String,
    enum: ['HR', 'CANDIDATE'],  // only these two values are allowed
    default: 'CANDIDATE'        // new users are Candidates by default
  },

  // Flag for soft-disabling accounts without deleting them
  isActive: {
    type: Boolean,
    default: true
  }

}, {
  // Automatically adds 'createdAt' and 'updatedAt' timestamp fields
  timestamps: true
});

// ─────────────────────────────────────────────────────────
// PRE-SAVE HOOK — Hash Password Before Saving
//
// This runs automatically every time a User document is saved.
// It only hashes the password if it was changed (new user or
// password update) to avoid double-hashing.
//
// bcrypt uses 'salt rounds' (10) to make the hash strong and
// computationally expensive, which protects against brute-force attacks.
// ─────────────────────────────────────────────────────────
userSchema.pre('save', async function(next) {
  // Skip hashing if the password field was not modified
  if (!this.isModified('password')) return next();

  // Generate a salt and hash the password
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─────────────────────────────────────────────────────────
// INSTANCE METHOD — Compare Password for Login
//
// Called during login to check if the entered plain-text password
// matches the stored hash. bcrypt.compare handles this securely.
// ─────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Export the model so other files can use it with:
//   const User = require('../models/User');
module.exports = mongoose.model('User', userSchema);
