// Run this once with `npm run seed:admin` to create the first admin account
// (from the ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD values in your .env).
// After that, the admin can create every other account from the admin panel.

require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');

const run = async () => {
  await connectDB();

  const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Admin';

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in your .env file first.');
    process.exit(1);
  }

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`An account with ${email} already exists (role: ${existing.role}). Nothing to do.`);
    process.exit(0);
  }

  const hashed = await bcrypt.hash(password, 10);
  await User.create({ name, email, password: hashed, role: 'admin' });

  console.log(`Admin account created for ${email}. You can now log in from the frontend.`);
  process.exit(0);
};

run();
