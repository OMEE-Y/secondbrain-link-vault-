require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();

// ===== Middleware =====
app.use(express.json());

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://secondbrain-link-vault.vercel.app'
  ],
  credentials: true
}));

// ===== DB Connection =====
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB Error:', err.message);
    process.exit(1);
  });

// ===== Models =====
const User = mongoose.model('User', new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true }
}, { timestamps: true }));

const Link = mongoose.model('Link', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
  tags: [String]
}, { timestamps: true }));

// ===== Utils =====
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const isValidHttpsUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

// ===== Auth Middleware =====
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');

  if (!token) {
    return res.status(401).json({ message: 'No token, unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// ===== Routes =====

// Register
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || username.length < 3) {
      return res.status(400).json({ message: 'Username too short' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password too short' });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      password: hashed
    });

    const token = generateToken(user._id);

    res.json({ token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.json({ token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Links
app.get('/links', auth, async (req, res) => {
  try {
    const links = await Link.find({ userId: req.user.id }).lean();
    res.json(links);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add Link
app.post('/links', auth, async (req, res) => {
  try {
    const { title, url, tags } = req.body;

    if (!title || !url) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    if (!isValidHttpsUrl(url)) {
      return res.status(400).json({ message: 'Only HTTPS URLs allowed' });
    }

    const link = await Link.create({
      userId: req.user.id,
      title,
      url,
      tags: tags || []
    });

    res.json(link);

  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete Link
app.delete('/links/:id', auth, async (req, res) => {
  try {
    const result = await Link.deleteOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Link not found' });
    }

    res.json({ message: 'Deleted' });

  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Health
app.get('/health', (req, res) => res.send('OK'));

// ===== Server =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));