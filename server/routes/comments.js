const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function formatComment(row) {
  if (!row) return null;
  return {
    id: row.id,
    post_id: row.post_id,
    content: row.content,
    created_at: row.created_at,
    author: {
      id: row.author_id,
      username: row.author_username,
      avatar_url: row.author_avatar,
      bio: row.author_bio
    }
  };
}

// GET /api/posts/:postId/comments - retrieve all comments for a post
router.get('/posts/:postId/comments', (req, res) => {
  try {
    const postId = Number(req.params.postId);
    if (!postId || isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid post ID.' });
    }

    // Verify post exists
    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const rows = db.prepare(`
      SELECT
        c.id, c.post_id, c.content, c.created_at, c.author_id,
        u.username AS author_username,
        u.avatar_url AS author_avatar,
        u.bio AS author_bio
      FROM comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `).all(postId);

    const comments = rows.map(formatComment);
    res.json({ comments, count: comments.length });
  } catch (err) {
    console.error('Fetch comments error:', err);
    res.status(500).json({ error: 'Failed to retrieve comments.' });
  }
});

// POST /api/posts/:postId/comments - add a comment to a post (Requires Auth)
router.post('/posts/:postId/comments', authenticateToken, (req, res) => {
  try {
    const postId = Number(req.params.postId);
    if (!postId || isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid post ID.' });
    }

    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const { content } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content cannot be empty.' });
    }

    if (content.trim().length > 2000) {
      return res.status(400).json({ error: 'Comment must not exceed 2000 characters.' });
    }

    const trimmedContent = content.trim();

    const insert = db.prepare(`
      INSERT INTO comments (post_id, author_id, content)
      VALUES (?, ?, ?)
    `);

    const result = insert.run(postId, req.user.id, trimmedContent);

    const createdRow = db.prepare(`
      SELECT
        c.id, c.post_id, c.content, c.created_at, c.author_id,
        u.username AS author_username,
        u.avatar_url AS author_avatar,
        u.bio AS author_bio
      FROM comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Comment posted successfully!',
      comment: formatComment(createdRow)
    });
  } catch (err) {
    console.error('Add comment error:', err);
    res.status(500).json({ error: 'Failed to post comment.' });
  }
});

// DELETE /api/comments/:id - delete comment (Comment author OR Post author can delete)
router.delete('/comments/:id', authenticateToken, (req, res) => {
  try {
    const commentId = Number(req.params.id);
    if (!commentId || isNaN(commentId)) {
      return res.status(400).json({ error: 'Invalid comment ID.' });
    }

    const comment = db.prepare(`
      SELECT c.*, p.author_id AS post_author_id
      FROM comments c
      JOIN posts p ON c.post_id = p.id
      WHERE c.id = ?
    `).get(commentId);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    // Check authorization: Must be either comment author or owner of the blog post
    const isCommentAuthor = comment.author_id === req.user.id;
    const isPostAuthor = comment.post_author_id === req.user.id;

    if (!isCommentAuthor && !isPostAuthor) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own comments or comments on your posts.' });
    }

    db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);

    res.json({
      message: 'Comment deleted successfully.',
      id: commentId
    });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ error: 'Failed to delete comment.' });
  }
});

module.exports = router;
