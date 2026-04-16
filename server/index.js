const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(express.json());

// FIXED CORS (frontend runs on 3000)
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://secondbrain-link-vault.vercel.app'
  ],
  credentials: true
}));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// Models
const User = mongoose.model('User', new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true }
}));

const Link = mongoose.model('Link', new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  title: String,
  url: String,
  tags: [String]
}));

// Auth Middleware
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id: ... }
    next();
  } catch (e) {
    res.status(400).json({ message: 'Token invalid' });
  }
};

// Auth Routes
app.post('/register', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = await User.create({
      username: req.body.username,
      password: hashedPassword
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ token });

  } catch (e) {
    res.status(400).json({ message: "Username taken" });
  }
});

app.post('/login', async (req, res) => {
  const user = await User.findOne({ username: req.body.username });

  if (!user || !await bcrypt.compare(req.body.password, user.password)) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  res.json({ token });
});


// GET all links for user
app.get('/links', auth, async (req, res) => {
  try {
    const links = await Link.find({ userId: req.user.id });
    res.json(links);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ADD new link
app.post('/links', auth, async (req, res) => {
  try {
    const link = await Link.create({
      userId: req.user.id,
      title: req.body.title,
      url: req.body.url,
      tags: req.body.tags || []
    });

    res.json(link);
  } catch (err) {
    res.status(500).json({ message: 'Error adding link' });
  }
});

// DELETE link
app.delete('/links/:id', auth, async (req, res) => {
  try {
    await Link.deleteOne({
      _id: req.params.id,
      userId: req.user.id
    });

    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting link' });
  }
});

app.listen(5000, () => console.log('Backend running on 5000'));