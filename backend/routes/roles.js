const express = require('express');
const Role = require('../models/Role');
const User = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

// Everything here is admin-only: roles are used when creating/editing
// accounts, which only admins can do.
router.use(protect, requireRole('admin'));

// GET /api/roles
router.get('/', async (req, res) => {
  const roles = await Role.find().sort({ isCore: -1, name: 1 });
  res.json({ roles });
});

// POST /api/roles
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Role name is required' });
    }

    const normalized = name.trim().toLowerCase();
    const existing = await Role.findOne({ name: normalized });
    if (existing) {
      return res.status(409).json({ message: 'That role already exists' });
    }

    const role = await Role.create({ name: normalized, isCore: false });
    res.status(201).json({ message: 'Role created', role });
  } catch (err) {
    res.status(500).json({ message: 'Could not create role', error: err.message });
  }
});

// PATCH /api/roles/:id - rename a non-core role
router.patch('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ message: 'Role not found' });

    if (role.isCore) {
      return res.status(403).json({ message: 'Core roles (admin, technician, user) cannot be renamed' });
    }

    if (name && name.trim()) role.name = name.trim().toLowerCase();
    await role.save();

    res.json({ message: 'Role updated', role });
  } catch (err) {
    res.status(500).json({ message: 'Could not update role', error: err.message });
  }
});

// DELETE /api/roles/:id
router.delete('/:id', async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ message: 'Role not found' });

    if (role.isCore) {
      return res.status(403).json({ message: 'Core roles (admin, technician, user) cannot be deleted' });
    }

    const inUse = await User.exists({ role: role.name });
    if (inUse) {
      return res.status(409).json({ message: 'This role is assigned to an existing account and cannot be deleted' });
    }

    await Role.findByIdAndDelete(req.params.id);
    res.json({ message: 'Role deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Could not delete role', error: err.message });
  }
});

module.exports = router;
