const express = require('express');
const db = require('../db');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Helper to format post row
function formatPost(row) {
  if (!row) return null;
  let parsedTags = [];
  try {
    parsedTags = row.tags ? JSON.parse(row.tags) : [];
  } catch {
    parsedTags = row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  }

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    excerpt: row.excerpt,
    cover_image: row.cover_image,
    tags: parsedTags,
    created_at: row.created_at,
    updated_at: row.updated_at,
    comment_count: Number(row.comment_count || 0),
    likes_count: Number(row.likes_count || 0),
    user_has_liked: Boolean(row.user_has_liked),
    author: {
      id: row.author_id,
      username: row.author_username,
      avatar_url: row.author_avatar,
      bio: row.author_bio
    }
  };
}

// GET /api/posts - list all posts with optional search, tag, or author filter
router.get('/', optionalAuth, (req, res) => {
  try {
    const { search, tag, author } = req.query;
    const currentUserId = req.user ? Number(req.user.id) : 0;

    let sql = `
      SELECT
        p.id, p.title, p.content, p.excerpt, p.cover_image, p.tags,
        p.created_at, p.updated_at, p.author_id,
        u.username AS author_username,
        u.avatar_url AS author_avatar,
        u.bio AS author_bio,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id AND l.user_id = ${currentUserId}) > 0 AS user_has_liked
      FROM posts p
      JOIN users u ON p.author_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      sql += ` AND (p.title LIKE ? OR p.content LIKE ? OR p.tags LIKE ?)`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (tag && tag.trim()) {
      const tagTerm = `%${tag.trim()}%`;
      sql += ` AND p.tags LIKE ?`;
      params.push(tagTerm);
    }

    if (author && author.trim()) {
      const authorVal = author.trim();
      if (/^\d+$/.test(authorVal)) {
        sql += ` AND p.author_id = ?`;
        params.push(Number(authorVal));
      } else {
        sql += ` AND LOWER(u.username) = LOWER(?)`;
        params.push(authorVal);
      }
    }

    sql += ` ORDER BY p.created_at DESC`;

    const rows = db.prepare(sql).all(...params);
    const posts = rows.map(formatPost);

    res.json({
      posts,
      total: posts.length
    });
  } catch (err) {
    console.error('Fetch posts error:', err);
    res.status(500).json({ error: 'Failed to retrieve posts.' });
  }
});

// GET /api/posts/:id - single post detail
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const postId = Number(req.params.id);
    if (!postId || isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid post ID.' });
    }

    const currentUserId = req.user ? Number(req.user.id) : 0;

    const row = db.prepare(`
      SELECT
        p.id, p.title, p.content, p.excerpt, p.cover_image, p.tags,
        p.created_at, p.updated_at, p.author_id,
        u.username AS author_username,
        u.avatar_url AS author_avatar,
        u.bio AS author_bio,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id AND l.user_id = ${currentUserId}) > 0 AS user_has_liked
      FROM posts p
      JOIN users u ON p.author_id = u.id
      WHERE p.id = ?
    `).get(postId);

    if (!row) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    res.json({ post: formatPost(row) });
  } catch (err) {
    console.error('Fetch post detail error:', err);
    res.status(500).json({ error: 'Failed to retrieve post details.' });
  }
});

// POST /api/posts/:id/like - toggle like on a post (Requires Auth)
router.post('/:id/like', authenticateToken, (req, res) => {
  try {
    const postId = Number(req.params.id);
    if (!postId || isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid post ID.' });
    }

    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const userId = Number(req.user.id);
    const existing = db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?').get(postId, userId);

    let liked = false;
    if (existing) {
      db.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?').run(postId, userId);
      liked = false;
    } else {
      db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)').run(postId, userId);
      liked = true;
    }

    const countRow = db.prepare('SELECT COUNT(*) as count FROM likes WHERE post_id = ?').get(postId);
    const likesCount = Number(countRow ? countRow.count : 0);

    res.json({
      message: liked ? 'Post liked!' : 'Post unliked.',
      liked,
      likes_count: likesCount
    });
  } catch (err) {
    console.error('Toggle like error:', err);
    res.status(500).json({ error: 'Failed to toggle like.' });
  }
});

// POST /api/posts - create new post (Requires Auth)
router.post('/', authenticateToken, (req, res) => {
  try {
    const { title, content, excerpt, cover_image, tags } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({ error: 'Title must be at least 3 characters long.' });
    }

    if (!content || typeof content !== 'string' || content.trim().length < 10) {
      return res.status(400).json({ error: 'Content must be at least 10 characters long.' });
    }

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    // Generate clean excerpt if not explicitly passed
    const cleanExcerpt = excerpt && excerpt.trim()
      ? excerpt.trim().substring(0, 200)
      : trimmedContent.replace(/[#*`_\[\]()]/g, '').trim().substring(0, 160) + (trimmedContent.length > 160 ? '...' : '');

    // Normalize tags array
    let normalizedTags = [];
    if (Array.isArray(tags)) {
      normalizedTags = tags.map(t => String(t).trim()).filter(Boolean);
    } else if (typeof tags === 'string' && tags.trim()) {
      normalizedTags = tags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);
    }

    const fallbackCovers = [
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=900&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=900&auto=format&fit=crop&q=80'
    ];
    const finalCover = cover_image && cover_image.trim()
      ? cover_image.trim()
      : fallbackCovers[Math.floor(Math.random() * fallbackCovers.length)];

    const stmt = db.prepare(`
      INSERT INTO posts (title, content, excerpt, cover_image, tags, author_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      trimmedTitle,
      trimmedContent,
      cleanExcerpt,
      finalCover,
      JSON.stringify(normalizedTags),
      req.user.id
    );

    const createdRow = db.prepare(`
      SELECT
        p.id, p.title, p.content, p.excerpt, p.cover_image, p.tags,
        p.created_at, p.updated_at, p.author_id,
        u.username AS author_username,
        u.avatar_url AS author_avatar,
        u.bio AS author_bio,
        0 AS comment_count
      FROM posts p
      JOIN users u ON p.author_id = u.id
      WHERE p.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Post published successfully!',
      post: formatPost(createdRow)
    });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Failed to create post.' });
  }
});

// PUT /api/posts/:id - edit post (Requires Auth + Author check)
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const postId = Number(req.params.id);
    if (!postId || isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid post ID.' });
    }

    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    if (post.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You can only edit your own posts.' });
    }

    const { title, content, excerpt, cover_image, tags } = req.body;

    if (title && (typeof title !== 'string' || title.trim().length < 3)) {
      return res.status(400).json({ error: 'Title must be at least 3 characters long.' });
    }

    if (content && (typeof content !== 'string' || content.trim().length < 10)) {
      return res.status(400).json({ error: 'Content must be at least 10 characters long.' });
    }

    const newTitle = title ? title.trim() : post.title;
    const newContent = content ? content.trim() : post.content;
    const newExcerpt = excerpt !== undefined
      ? (excerpt.trim() || newContent.substring(0, 160) + '...')
      : post.excerpt;
    const newCover = cover_image !== undefined ? cover_image.trim() : post.cover_image;

    let newTags = post.tags;
    if (tags !== undefined) {
      if (Array.isArray(tags)) {
        newTags = JSON.stringify(tags.map(t => String(t).trim()).filter(Boolean));
      } else if (typeof tags === 'string') {
        newTags = JSON.stringify(tags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean));
      }
    }

    db.prepare(`
      UPDATE posts
      SET title = ?, content = ?, excerpt = ?, cover_image = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newTitle, newContent, newExcerpt, newCover, newTags, postId);

    const updatedRow = db.prepare(`
      SELECT
        p.id, p.title, p.content, p.excerpt, p.cover_image, p.tags,
        p.created_at, p.updated_at, p.author_id,
        u.username AS author_username,
        u.avatar_url AS author_avatar,
        u.bio AS author_bio,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count
      FROM posts p
      JOIN users u ON p.author_id = u.id
      WHERE p.id = ?
    `).get(postId);

    res.json({
      message: 'Post updated successfully!',
      post: formatPost(updatedRow)
    });
  } catch (err) {
    console.error('Update post error:', err);
    res.status(500).json({ error: 'Failed to update post.' });
  }
});

// DELETE /api/posts/:id - delete post (Requires Auth + Author check)
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const postId = Number(req.params.id);
    if (!postId || isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid post ID.' });
    }

    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    if (post.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own posts.' });
    }

    db.prepare('DELETE FROM posts WHERE id = ?').run(postId);

    res.json({
      message: 'Post and associated comments deleted successfully.',
      id: postId
    });
  } catch (err) {
    console.error('Delete post error:', err);
    res.status(500).json({ error: 'Failed to delete post.' });
  }
});

module.exports = router;
