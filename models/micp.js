const mongoose = require('mongoose');

const micpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    codeChefId: {
      type: String,
      required: false,
      unique: true,
      trim: true,
      lowercase: true,
    },
    codeForcesId: {
      type: String,
      required: false,
      unique: true,
      trim: true,
      lowercase: true,
    },
    ccCurrentRating: {
      type: Number,
      default: 0,
    },
    ccInitialRating: {
      type: Number,
      default: 0,
    },
    cfCurrentRating: {
      type: Number,
      default: 0,
    },
    cfInitialRating: {
      type: 0,
      default: 0,
    },
    score: {
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
