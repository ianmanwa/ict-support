const express = require('express');
const Ticket = require('../models/Ticket');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// POST /api/tickets - a user submits a new ICT support request
router.post('/', requireRole('user', 'admin', 'technician'), async (req, res) => {
  try {
    const { name, location, details } = req.body;

    if (!name || !location) {
      return res.status(400).json({ message: 'Name and location are required' });
    }

    const ticket = await Ticket.create({
      requester: req.user._id,
      name,
      location,
      details: details || ''
    });

    res.status(201).json({ message: 'Ticket submitted', ticket });
  } catch (err) {
    res.status(500).json({ message: 'Could not submit ticket', error: err.message });
  }
});

// GET /api/tickets/mine - the logged-in user's own tickets (open + closed)
router.get('/mine', async (req, res) => {
  const tickets = await Ticket.find({ requester: req.user._id })
    .populate('assignedTechnician', 'name email')
    .sort({ createdAt: -1 });
  res.json({ tickets });
});

// GET /api/tickets/assigned - tickets assigned to the logged-in technician
router.get('/assigned', requireRole('technician', 'admin'), async (req, res) => {
  const tickets = await Ticket.find({ assignedTechnician: req.user._id })
    .populate('requester', 'name email')
    .sort({ createdAt: -1 });
  res.json({ tickets });
});

// GET /api/tickets - all tickets (admin only)
router.get('/', requireRole('admin'), async (req, res) => {
  const tickets = await Ticket.find()
    .populate('requester', 'name email')
    .populate('assignedTechnician', 'name email')
    .sort({ createdAt: -1 });
  res.json({ tickets });
});

// PATCH /api/tickets/:id/approve - admin approves a pending ticket
router.patch('/:id/approve', requireRole('admin'), async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

  ticket.status = 'approved';
  await ticket.save();
  res.json({ message: 'Ticket approved', ticket });
});

// PATCH /api/tickets/:id/deny - admin denies a pending ticket
router.patch('/:id/deny', requireRole('admin'), async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

  ticket.status = 'denied';
  await ticket.save();
  res.json({ message: 'Ticket denied', ticket });
});

// PATCH /api/tickets/:id/assign - admin assigns a technician
router.patch('/:id/assign', requireRole('admin'), async (req, res) => {
  try {
    const { technicianId } = req.body;
    if (!technicianId) {
      return res.status(400).json({ message: 'technicianId is required' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    ticket.assignedTechnician = technicianId;
    ticket.status = 'assigned';
    // reassigning resets progress so the new technician starts fresh
    ticket.technicianSolved = false;
    await ticket.save();

    res.json({ message: 'Technician assigned', ticket });
  } catch (err) {
    res.status(500).json({ message: 'Could not assign technician', error: err.message });
  }
});

// PATCH /api/tickets/:id/solve - user or technician marks their side solved.
// The ticket only closes once BOTH sides have marked it solved.
router.patch('/:id/solve', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const isRequester = ticket.requester.toString() === req.user._id.toString();
    const isAssignedTechnician =
      ticket.assignedTechnician && ticket.assignedTechnician.toString() === req.user._id.toString();

    if (!isRequester && !isAssignedTechnician && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You are not part of this ticket' });
    }

    if (isRequester || req.user.role === 'admin') ticket.userSolved = true;
    if (isAssignedTechnician || req.user.role === 'admin') ticket.technicianSolved = true;

    if (ticket.userSolved && ticket.technicianSolved) {
      ticket.status = 'closed';
      ticket.closedAt = new Date();
      ticket.closedBy = 'both';
    }

    await ticket.save();
    res.json({ message: 'Solved status updated', ticket });
  } catch (err) {
    res.status(500).json({ message: 'Could not update ticket', error: err.message });
  }
});

// DELETE /api/tickets/:id - admin force-closes / deletes a ticket
router.delete('/:id', requireRole('admin'), async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

  await Ticket.findByIdAndDelete(req.params.id);
  res.json({ message: 'Ticket deleted' });
});

// PATCH /api/tickets/:id/force-close - admin closes without deleting the record
router.patch('/:id/force-close', requireRole('admin'), async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

  ticket.status = 'closed';
  ticket.closedAt = new Date();
  ticket.closedBy = 'admin';
  await ticket.save();
  res.json({ message: 'Ticket force-closed', ticket });
});

module.exports = router;
