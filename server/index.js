require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');

const app = express();

// ===== Security Middleware =====
app.use(helmet()); 
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://secondbrain-link-vault.vercel.app'
  ],
  credentials: true
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10, 
  message: { message: 'Too many requests, please try again later.' }
});

// ===== Validation Schemas =====
const authSchema = z.object({
  username: z.string().min(3).max(30).trim(),
  password: z.string().min(6).max(100)
});

const linkSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  url: z.string().url(),
  tags: z.array(z.string()).optional()
});


if (!process.env.MONGO_URI) {
  console.error('FATAL ERROR: MONGO_URI is not defined.');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB Error:', err.message);
    process.exit(1);
  });

// ===== Models =====
const User = mongoose.model('User', new mongoose.Schema({
  username: { type: String, unique: true, required: true, index: true },
  password: { type: String, required: true }
}, { timestamps: true }));

const Link = mongoose.model('Link', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
  tags: [String]
}, { timestamps: true }));

// ===== Utils =====
const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'No token, unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// ===== Routes =====


app.post('/register', authLimiter, async (req, res) => {
  const validation = authSchema.safeParse(req.body);
  if (!validation.success) return res.status(400).json({ errors: validation.error.issues });

  try {
    const { username, password } = validation.data;
    const hashed = await bcrypt.hash(password, 10);
    
    const user = await User.create({ username, password: hashed });
    res.json({ token: generateToken(user._id) });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'User already exists' });
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
app.post('/login', authLimiter, async (req, res) => {
  const validation = authSchema.safeParse(req.body);
  if (!validation.success) return res.status(400).json({ message: 'Invalid input' });

  try {
    const { username, password } = validation.data;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    res.json({ token: generateToken(user._id) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});


app.get('/links', auth, async (req, res) => {
  try {
    const links = await Link.find({ userId: req.user.id }).lean();
    res.json(links);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

app.post('/links', auth, async (req, res) => {
  const validation = linkSchema.safeParse(req.body);
  if (!validation.success) return res.status(400).json({ errors: validation.error.issues });

  try {
    const link = await Link.create({ userId: req.user.id, ...validation.data });
    res.status(201).json(link);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

app.delete('/links/:id', auth, async (req, res) => {
  try {
    const result = await Link.deleteOne({ _id: req.params.id, userId: req.user.id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Link not found' });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

app.get('/health', (req, res) => res.send('OK'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));