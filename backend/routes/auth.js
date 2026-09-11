const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        defaultLocation: user.defaultLocation
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error during login', error: err.message });
  }
});

// GET /api/auth/me - return the currently logged in user
router.get('/me', protect, async (req, res) => {
  res.json({ user: req.user });
});

// PATCH /api/auth/profile - save default name/location used to pre-fill the form
router.patch('/profile', protect, async (req, res) => {
  try {
    const { name, defaultLocation } = req.body;

    if (name !== undefined) req.user.name = name;
    if (defaultLocation !== undefined) req.user.defaultLocation = defaultLocation;

    await req.user.save();
    res.json({ message: 'Profile updated', user: req.user });
  } catch (err) {
    res.status(500).json({ message: 'Could not update profile', error: err.message });
  }
});

// PATCH /api/auth/account - change your own login email and/or password.
// Available to any role (admins included) so nobody has to touch the
// database directly to update their own credentials.
router.patch('/account', protect, async (req, res) => {
  try {
    const { currentPassword, newEmail, newPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({ message: 'Your current password is required to make this change' });
    }

    // req.user came back without the password field (see middleware/auth.js),
    // so re-fetch this user with the password included to verify it.
    const account = await User.findById(req.user._id);

    const match = await bcrypt.compare(currentPassword, account.password);
    if (!match) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    if (newEmail) {
      const normalized = newEmail.toLowerCase().trim();
      if (normalized !== account.email) {
        const existing = await User.findOne({ email: normalized });
        if (existing) {
          return res.status(409).json({ message: 'That email is already in use' });
        }
        account.email = normalized;
      }
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters' });
      }
      account.password = await bcrypt.hash(newPassword, 10);
    }

    await account.save();

    res.json({
      message: 'Account updated',
      user: {
        id: account._id,
        name: account.name,
        email: account.email,
        role: account.role,
        defaultLocation: account.defaultLocation
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Could not update account', error: err.message });
  }
});

module.exports = router;
