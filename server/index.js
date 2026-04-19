require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const compression = require('compression');
const { body, validationResult } = require('express-validator');

const app = express();

// Middleware
app.use(helmet());
app.use(compression()); 
app.use(express.json());
app.use(mongoSanitize());
app.use(hpp());

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://secondbrain-link-vault.vercel.app'
  ],
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Async Wrapper to avoid try-catch spam
const asyncHandler = (fn) => (req, res, next) => 
  Promise.resolve(fn(req, res, next)).catch(next);

// DB Connection
mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000
})
.then(() => console.log("MongoDB Connected"))
.catch(err => console.error("DB Connection Error:", err));

// Models
const User = mongoose.model('User', new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true }
}, { timestamps: true }));



const LinkSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, index: true },
  title: String,
  url: String,
  tags: [String]
}, { timestamps: true });
const Link = mongoose.model('Link', LinkSchema);

// Auth Middleware
const auth = (req, res, next) => {
  const token = req.headers['x-auth-token'];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const isValidHttpsUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

// Routes
app.post('/register', 
  body('username').isLength({ min: 3 }),
  body('password').isLength({ min: 6 }),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = await User.create({
      username: req.body.username,
      password: hashedPassword
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token });
}));

app.post('/login', asyncHandler(async (req, res) => {
  const user = await User.findOne({ username: req.body.username });
  if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.json({ token });
}));

app.get('/links', auth, asyncHandler(async (req, res) => {
  // Using lean() and projection for faster reads
  const links = await Link.find({ userId: req.user.id }, 'title url tags')
    .lean();
  res.json(links);
}));

app.post('/links', auth,
  body('title').notEmpty(),
  body('url').notEmpty(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    if (!isValidHttpsUrl(req.body.url)) return res.status(400).json({ message: 'Only HTTPS URLs allowed' });

    const link = await Link.create({
      userId: req.user.id,
      title: req.body.title,
      url: req.body.url,
      tags: req.body.tags || []
    });
    res.json(link);
}));

app.delete('/links/:id', auth, asyncHandler(async (req, res) => {
  const result = await Link.deleteOne({ _id: req.params.id, userId: req.user.id });
  if (result.deletedCount === 0) return res.status(404).json({ message: 'Link not found' });
  res.json({ message: 'Deleted' });
}));

app.get('/health', (req, res) => res.send('OK'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));