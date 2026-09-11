require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const ticketRoutes = require('./routes/tickets');

const app = express();

connectDB();

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
