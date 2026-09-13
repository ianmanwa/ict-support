const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    // Not a fixed enum: assignable values are managed in the Role
    // collection (see models/Role.js) so admins can add custom roles.
    // The three core values 'admin', 'technician', 'user' are what the
    // rest of the app's permission checks actually key off of.
    role: {
      type: String,
      default: 'user',
      lowercase: true,
      trim: true
    },
    // Default location/phone saved from profile settings, pre-fills the
    // "Request ICT support" form.
    defaultLocation: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
