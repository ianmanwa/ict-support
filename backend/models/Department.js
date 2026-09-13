const mongoose = require('mongoose');

// A simple lookup table so departments can be managed from the admin
// "Manage Data" screen instead of being hardcoded in the frontend.
const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Department', departmentSchema);
