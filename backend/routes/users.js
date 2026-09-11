const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

// All routes below require a logged-in admin
router.use(protect, requireRole('admin'));

// GET /api/users - list every account (admin only)
router.get('/', async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json({ users });
});

// POST /api/users - admin creates a user or technician account
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const allowedRoles = ['user', 'technician', 'admin'];
    const finalRole = allowedRoles.includes(role) ? role : 'user';

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'An account with that email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password: hashed,
      role: finalRole
    });

    res.status(201).json({
      message: 'Account created',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Could not create account', error: err.message });
  }
});

// PATCH /api/users/:id - admin edits another account's name, email, role,
// and/or resets their password (leave a field out/blank to keep it as-is).
router.patch('/:id', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });

    if (name) target.name = name;

    if (email) {
      const normalized = email.toLowerCase().trim();
      if (normalized !== target.email) {
        const existing = await User.findOne({ email: normalized });
        if (existing) {
          return res.status(409).json({ message: 'That email is already in use' });
        }
        target.email = normalized;
      }
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      target.password = await bcrypt.hash(password, 10);
    }

    if (role) {
      if (!['user', 'technician', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      target.role = role;
    }

    await target.save();

    res.json({
      message: 'Account updated',
      user: { id: target._id, name: target.name, email: target.email, role: target.role }
    });
  } catch (err) {
    res.status(500).json({ message: 'Could not update account', error: err.message });
  }
});

// PATCH /api/users/:id/role - grant/change a user's role
router.patch('/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'technician', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.role = role;
    await user.save();

    res.json({ message: 'Role updated', user: { id: user._id, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Could not update role', error: err.message });
  }
});

// DELETE /api/users/:id - remove an account
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Could not delete user', error: err.message });
  }
});

// GET /api/users/technicians - convenience list for the ticket-assignment dropdown
router.get('/role/technicians', async (req, res) => {
  const technicians = await User.find({ role: 'technician' }).select('-password');
  res.json({ technicians });
});

module.exports = router;
