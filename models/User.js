const mongoose = require('mongoose');

const bcrypt = require('bcrypt');

const boxSchema = new mongoose.Schema({
    title: String,
    content: String,
    views: { type: Number, default: 0 },
    imageUrl: String,
  photos: [
    {
      filename: String,
    },
  ],
  });



const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'user','guest'],
    default: 'user',
  },
});
const User = mongoose.model('User', userSchema);

const Box = mongoose.model('Box1', boxSchema);
module.exports = { User , Box };