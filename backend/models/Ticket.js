const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    details: {
      type: String,
      default: ''
    },
    // pending  -> waiting for admin approval
    // denied   -> admin rejected the request
    // approved -> approved, not yet assigned
    // assigned -> a technician has been assigned, work in progress
    // closed   -> both sides marked solved, or admin force-closed it
    status: {
      type: String,
      enum: ['pending', 'denied', 'approved', 'assigned', 'closed'],
      default: 'pending'
    },
    assignedTechnician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    userSolved: {
      type: Boolean,
      default: false
    },
    technicianSolved: {
      type: Boolean,
      default: false
    },
    closedAt: {
      type: Date,
      default: null
    },
    closedBy: {
      // 'both' = both parties marked solved, 'admin' = admin force-closed
      type: String,
      enum: ['both', 'admin', null],
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ticket', ticketSchema);
