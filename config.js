require('dotenv').config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_DATABASE_DEV: process.env.MONGO_DATABASE_DEV,
};
