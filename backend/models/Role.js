const mongoose = require('mongoose');

// A lookup table of assignable role names, manageable from the admin
// "Manage Data" screen. Note: the app's actual permission checks
// (middleware/auth.js requireRole) are hardcoded against the literal
// values 'admin', 'technician' and 'user' — those three are marked
// isCore and can't be deleted, since removing them would break login
// routing and access control. Any additional custom roles an admin adds
// here are just labels for organizing accounts; they won't unlock new
// pages unless the application code is extended to check for them.
const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    isCore: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Role', roleSchema);
