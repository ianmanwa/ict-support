require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const Role = require('./models/Role');
const Department = require('./models/Department');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const ticketRoutes = require('./routes/tickets');
const departmentRoutes = require('./routes/departments');
const roleRoutes = require('./routes/roles');
const reportRoutes = require('./routes/reports');

const app = express();

// Makes sure the core roles always exist, and seeds a starter set of
// departments so the "Request ICT support" dropdown isn't empty on a
// fresh install. Both can be edited/added to from the admin "Manage Data"
// screen afterwards.
async function ensureDefaults() {
  const coreRoles = ['admin', 'technician', 'user'];
  for (const name of coreRoles) {
    await Role.updateOne({ name }, { $setOnInsert: { name, isCore: true } }, { upsert: true });
  }

  const departmentCount = await Department.countDocuments();
  if (departmentCount === 0) {
    await Department.insertMany([
      { name: 'General' },
      { name: 'Hardware' },
      { name: 'Software' },
      { name: 'Network' }
    ]);
  }
}

connectDB().then(ensureDefaults);

// CLIENT_ORIGIN can be a single URL or a comma-separated list, which matters
// once the frontend is on Vercel: production domain + preview-deploy domains
// are all different origins. e.g.
//   CLIENT_ORIGIN=https://your-app.vercel.app,https://your-app-git-main-you.vercel.app
const allowedOrigins = (process.env.CLIENT_ORIGIN || '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // requests with no origin (curl, server-to-server, Render health checks) are allowed
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    }
  })
);
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ICT Help API is running' });
});

// Fallback for unknown routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`ICT Help API listening on port ${PORT}`);
});
