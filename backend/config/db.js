const mongoose = require('mongoose');

// The connection string lives in .env as MONGODB_URI so it can be swapped
// out for a hosted database (e.g. MongoDB Atlas) without touching any code.
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('MONGODB_URI is not set. Check your .env file.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
