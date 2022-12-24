const mongoose = require('mongoose');

const micpSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    currentRating: {
      type: Number,
      default: 0,
    },
    initialRating: {
      type: Number,
      default: 0,
    },
    name: {
      type: String,
    },
  },
  {
    collection: 'micp',
  },
);

module.exports = mongoose.model('Micp', micpSchema);
