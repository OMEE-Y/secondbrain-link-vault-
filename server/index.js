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


app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://secondbrain-link-vault.vercel.app',
  
  ],
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-auth-token']
}));


const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});


const authSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(30).trim(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100)
});

const linkSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).trim(),
  url: z.string().url('Invalid URL'),
  tags: z.array(z.string().trim()).optional().default([])
});


if (!process.env.MONGO_URI) {
  console.error('FATAL ERROR: MONGO_URI is not defined in environment variables.');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
  process.exit(1);
}

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  retryWrites: true,
  w: 'majority'
})
  .then(() => console.log('✓ MongoDB Connected'))
  .catch(err => {
    console.error('✗ MongoDB Connection Error:', err.message);
    process.exit(1);
  });

// MongoDB Schemas & Models
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
    index: true,
    lowercase: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  password: {
    type: String,
    required: true
  }
}, { timestamps: true });


userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

const User = mongoose.model('User', userSchema);

const linkSchema_db = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
    ref: 'User'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  tags: {
    type: [String],
    default: []
  }
}, { timestamps: true });

const Link = mongoose.model('Link', linkSchema_db);

// Utility: Generate JWT Token
const generateToken = (userId) => {
  try {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
  } catch (err) {
    console.error('Token generation error:', err);
    throw new Error('Failed to generate token');
  }
};


const auth = (req, res, next) => {
  const token = req.header('x-auth-token');

  if (!token) {
    return res.status(401).json({ message: 'No token provided. Authorization required.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please login again.' });
    }
    res.status(401).json({ message: 'Invalid token. Authorization failed.' });
  }
};

// Routes

//REGISTER Route
app.post('/register', authLimiter, async (req, res) => {
  try {
    // Validate input
    const validation = authSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: validation.error.issues[0].message || 'Invalid input',
        errors: validation.error.issues
      });
    }

    const { username, password } = validation.data;

    // Check if user already exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists. Please choose another.' });
    }

    // Create new user (password will be hashed by pre-save middleware)
    const user = await User.create({
      username: username.toLowerCase(),
      password
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({ token, userId: user._id });
  } catch (err) {
    console.error('Register error:', err.message);
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    res.status(500).json({ message: 'Server error during registration' });
  }
});

//  LOGIN Route
app.post('/login', authLimiter, async (req, res) => {
  try {
    // Validate input
    const validation = authSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: validation.error.issues[0].message || 'Invalid input',
        errors: validation.error.issues
      });
    }

    const { username, password } = validation.data;

    // Find user by username
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({ token, userId: user._id });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// GET LINKS Route
app.get('/links', auth, async (req, res) => {
  try {
    const links = await Link.find({ userId: req.user.id })
      .lean()
      .sort({ createdAt: -1 });

    res.json(links || []);
  } catch (err) {
    console.error('Get links error:', err.message);
    res.status(500).json({ message: 'Failed to fetch links' });
  }
});

// CREATE LINK Route
app.post('/links', auth, async (req, res) => {
  try {
    // Validate input
    const validation = linkSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: validation.error.issues[0].message || 'Invalid link data',
        errors: validation.error.issues
      });
    }

    const { title, url, tags } = validation.data;

    // Create link
    const link = await Link.create({
      userId: req.user.id,
      title,
      url,
      tags: tags || []
    });

    res.status(201).json({
      _id: link._id,
      title: link.title,
      url: link.url,
      tags: link.tags,
      createdAt: link.createdAt
    });
  } catch (err) {
    console.error('Create link error:', err.message);
    res.status(500).json({ message: 'Failed to create link' });
  }
});

// DELETE LINK Route
app.delete('/links/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid link ID' });
    }

    // Delete link (ensure it belongs to the authenticated user)
    const result = await Link.deleteOne({
      _id: id,
      userId: req.user.id
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Link not found or unauthorized' });
    }

    res.json({ message: 'Link deleted successfully' });
  } catch (err) {
    console.error('Delete link error:', err.message);
    res.status(500).json({ message: 'Failed to delete link' });
  }
});

// HEALTH CHECK Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});


app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
});


process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await mongoose.disconnect();
  process.exit(0);
});