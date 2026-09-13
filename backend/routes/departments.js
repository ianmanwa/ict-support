const express = require('express');
const Department = require('../models/Department');
const Ticket = require('../models/Ticket');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// GET /api/departments - any logged-in user can read the list (needed for
// the "Request ICT support" form dropdown).
router.get('/', async (req, res) => {
  const departments = await Department.find().sort({ name: 1 });
  res.json({ departments });
});

// Everything below (create/edit/delete) is admin-only.
router.use(requireRole('admin'));

// POST /api/departments
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Department name is required' });
    }

    const existing = await Department.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({ message: 'That department already exists' });
    }

    const department = await Department.create({ name: name.trim() });
    res.status(201).json({ message: 'Department created', department });
  } catch (err) {
    res.status(500).json({ message: 'Could not create department', error: err.message });
  }
});

// PATCH /api/departments/:id
router.patch('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found' });

    if (name && name.trim()) department.name = name.trim();
    await department.save();

    res.json({ message: 'Department updated', department });
  } catch (err) {
    res.status(500).json({ message: 'Could not update department', error: err.message });
  }
});

// DELETE /api/departments/:id
router.delete('/:id', async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found' });

    const inUse = await Ticket.exists({ department: department._id, isDeleted: false });
    if (inUse) {
      return res.status(409).json({
        message: 'This department is used by existing tickets and cannot be deleted'
      });
    }

    await Department.findByIdAndDelete(req.params.id);
    res.json({ message: 'Department deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Could not delete department', error: err.message });
  }
});

module.exports = router;
