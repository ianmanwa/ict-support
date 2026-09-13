const mongoose = require('mongoose');

const remarkSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

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
    phone: {
      type: String,
      default: ''
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null
    },
    details: {
      type: String,
      default: ''
    },
    // pending  -> waiting for a technician to be assigned
    // assigned -> a technician has been assigned, work in progress
    // closed   -> both sides marked solved, or admin closed it directly
    status: {
      type: String,
      enum: ['pending', 'assigned', 'closed'],
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
      // 'both' = both parties marked solved, 'admin' = admin closed it directly
      type: String,
      enum: ['both', 'admin', null],
      default: null
    },
    // Admin remarks are visible to the requester even before a
    // technician is assigned.
    remarks: {
      type: [remarkSchema],
      default: []
    },
    // Ghost delete: hidden from every view but kept in the database.
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ticket', ticketSchema);
