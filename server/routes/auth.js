const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', (req, res) => {
  try {
    const { username, email, password, bio, avatar_url } = req.body;

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const trimmedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // Check if username or email already taken
    const existing = db.prepare('SELECT id, username, email FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = ?').get(trimmedUsername, normalizedEmail);
    if (existing) {
      if (existing.email.toLowerCase() === normalizedEmail) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      return res.status(409).json({ error: 'Username is already taken.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const defaultAvatar = avatar_url && avatar_url.trim()
      ? avatar_url.trim()
      : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(trimmedUsername)}`;

    const insert = db.prepare(`
      INSERT INTO users (username, email, password_hash, bio, avatar_url)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = insert.run(trimmedUsername, normalizedEmail, passwordHash, bio ? bio.trim() : '', defaultAvatar);

    const newUser = db.prepare(`
      SELECT id, username, email, bio, avatar_url, created_at
      FROM users WHERE id = ?
    `).get(result.lastInsertRowid);

    const token = generateToken(newUser);

    res.status(201).json({
      message: 'Account created successfully!',
      user: newUser,
      token
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

// Login user
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(normalizedEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const passwordMatches = bcrypt.compareSync(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      bio: user.bio,
      avatar_url: user.avatar_url,
      created_at: user.created_at
    };

    const token = generateToken(safeUser);

    res.json({
      message: 'Logged in successfully!',
      user: safeUser,
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal login error.' });
  }
});

// Current authenticated user
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, username, email, bio, avatar_url, created_at
      FROM users WHERE id = ?
    `).get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

// Get demo users list for easy one-click testing
router.get('/demo-users', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, username, email, bio, avatar_url
      FROM users WHERE email IN ('alice@example.com', 'bob@example.com', 'charlie@example.com')
    `).all();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch demo users.' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, (req, res) => {
  try {
    const { bio, avatar_url } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const newBio = bio !== undefined ? String(bio).trim() : user.bio;
    const newAvatar = avatar_url !== undefined ? String(avatar_url).trim() : user.avatar_url;

    db.prepare(`
      UPDATE users
      SET bio = ?, avatar_url = ?
      WHERE id = ?
    `).run(newBio, newAvatar, req.user.id);

    const updated = db.prepare(`
      SELECT id, username, email, bio, avatar_url, created_at
      FROM users WHERE id = ?
    `).get(req.user.id);

    res.json({
      message: 'Profile updated successfully!',
      user: updated
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

module.exports = router;

