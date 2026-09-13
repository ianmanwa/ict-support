const express = require('express');
const Ticket = require('../models/Ticket');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

const populateTicket = (query) =>
  query
    .populate('requester', 'name email')
    .populate('assignedTechnician', 'name email')
    .populate('department', 'name');

// POST /api/tickets - a user submits a new ICT support request
router.post('/', requireRole('user', 'admin', 'technician'), async (req, res) => {
  try {
    const { name, location, details, department, phone } = req.body;

    if (!name || !location) {
      return res.status(400).json({ message: 'Name and location are required' });
    }

    const ticket = await Ticket.create({
      requester: req.user._id,
      name,
      location,
      details: details || '',
      phone: phone || '',
      department: department || null
    });

    const populated = await populateTicket(Ticket.findById(ticket._id));

    res.status(201).json({ message: 'Ticket submitted', ticket: populated });
  } catch (err) {
    res.status(500).json({ message: 'Could not submit ticket', error: err.message });
  }
});

// GET /api/tickets/mine - the logged-in user's own tickets (open + closed)
router.get('/mine', async (req, res) => {
  const tickets = await populateTicket(
    Ticket.find({ requester: req.user._id, isDeleted: false })
  ).sort({ createdAt: -1 });
  res.json({ tickets });
});

// GET /api/tickets/assigned - tickets assigned to the logged-in technician.
// A ticket only ever has assignedTechnician set once an admin assigns it,
// so an unassigned ticket is never visible here — technicians only see
// tickets once they've been assigned.
router.get('/assigned', requireRole('technician', 'admin'), async (req, res) => {
  const tickets = await populateTicket(
    Ticket.find({ assignedTechnician: req.user._id, isDeleted: false })
  ).sort({ createdAt: -1 });
  res.json({ tickets });
});

// GET /api/tickets - all tickets (admin only)
router.get('/', requireRole('admin'), async (req, res) => {
  const tickets = await populateTicket(Ticket.find({ isDeleted: false })).sort({ createdAt: -1 });
  res.json({ tickets });
});

// PATCH /api/tickets/:id/assign - admin assigns (or reassigns) a technician.
// This is the only path a ticket takes out of "pending" — there is no
// separate approve/deny step.
router.patch('/:id/assign', requireRole('admin'), async (req, res) => {
  try {
    const { technicianId } = req.body;
    if (!technicianId) {
      return res.status(400).json({ message: 'technicianId is required' });
    }

    const ticket = await Ticket.findOne({ _id: req.params.id, isDeleted: false });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    ticket.assignedTechnician = technicianId;
    ticket.status = 'assigned';
    // reassigning resets the technician's progress so the new technician starts fresh
    ticket.technicianSolved = false;
    await ticket.save();

    const populated = await populateTicket(Ticket.findById(ticket._id));
    res.json({ message: 'Technician assigned', ticket: populated });
  } catch (err) {
    res.status(500).json({ message: 'Could not assign technician', error: err.message });
  }
});

// PATCH /api/tickets/:id/remark - admin adds a remark, visible to the
// requester even before a technician is assigned.
router.patch('/:id/remark', requireRole('admin'), async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Remark text is required' });
    }

    const ticket = await Ticket.findOne({ _id: req.params.id, isDeleted: false });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    ticket.remarks.push({ text: text.trim() });
    await ticket.save();

    const populated = await populateTicket(Ticket.findById(ticket._id));
    res.json({ message: 'Remark added', ticket: populated });
  } catch (err) {
    res.status(500).json({ message: 'Could not add remark', error: err.message });
  }
});

// PATCH /api/tickets/:id/solve - user or technician marks their side solved.
// The ticket only closes once BOTH sides have marked it solved.
router.patch('/:id/solve', async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, isDeleted: false });
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
    const populated = await populateTicket(Ticket.findById(ticket._id));
    res.json({ message: 'Solved status updated', ticket: populated });
  } catch (err) {
    res.status(500).json({ message: 'Could not update ticket', error: err.message });
  }
});

// PATCH /api/tickets/:id/close - admin closes a ticket directly, regardless
// of the user/technician solved flags.
router.patch('/:id/close', requireRole('admin'), async (req, res) => {
  const ticket = await Ticket.findOne({ _id: req.params.id, isDeleted: false });
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

  ticket.status = 'closed';
  ticket.closedAt = new Date();
  ticket.closedBy = 'admin';
  await ticket.save();

  const populated = await populateTicket(Ticket.findById(ticket._id));
  res.json({ message: 'Ticket closed', ticket: populated });
});

// DELETE /api/tickets/:id - ghost delete: the ticket is flagged isDeleted
// and disappears from every view, but the record stays in the database.
router.delete('/:id', requireRole('admin'), async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

  ticket.isDeleted = true;
  await ticket.save();

  res.json({ message: 'Ticket deleted' });
});

module.exports = router;
