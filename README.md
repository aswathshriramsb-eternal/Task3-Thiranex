# BlogSphere — Full-Stack Blog Platform with Comments

A modern, responsive full-stack blogging platform where users can publish posts, engage in discussions through comment threads, search and filter articles by tags, and manage their content securely.

Built to fulfill all requirements of the **Blog Platform with Comments** assignment:
- **User registration, login, and authentication** (JWT + bcryptjs)
- **Create, edit, delete blog posts** (Full CRUD)
- **Comment section for user interaction**
- **Backend with RESTful APIs and database integration** (Node.js, Express, Native SQLite)

---

## 🌟 Key Features

1. **Authentication & Authorization**
   - User registration with unique username and email validation.
   - Secure password hashing using `bcryptjs`.
   - JWT (JSON Web Token) authentication with persistent sessions.
   - One-click demo login buttons (Alice & Bob) for instant evaluation.
   - Authorization safeguards: only authors can edit or delete their own posts; comments can be deleted by the comment author or post author.

2. **Blog Post Management (CRUD)**
   - **Create**: Markdown-supported rich editor with real-time preview, tag classification, and cover image presets.
   - **Read**: Responsive feed with reading time estimation, tags, author avatars, and comment count badges.
   - **Update**: Edit title, tags, cover image, and body.
   - **Delete**: Safely delete posts with automatic cascade deletion of associated comments.

3. **Interactive Comment System**
   - Comment threads under every post.
   - Dynamic counter and real-time updates without page reload.
   - Special author badge (`Author`) for comments posted by the article creator.
   - User friendly prompt directing guest visitors to log in or register before commenting.

4. **Search & Tag Filtering**
   - Instant search across story titles, body text, and tags.
   - Quick category pills (`Architecture`, `WebDev`, `SQLite`, `UI/UX Design`, `Tutorials`).
   - "My Stories" dashboard view for logged-in users.

---

## 🛠️ Technology Stack

- **Runtime**: Node.js v24+
- **Backend Framework**: Express.js
- **Database**: SQLite (via Node.js native `node:sqlite` module — zero external DB installation or configuration needed!)
- **Security & Auth**: `bcryptjs` (password hashing), `jsonwebtoken` (JWTs), `cors`
- **Frontend**: Responsive Single Page Application (HTML5, Tailwind CSS, Font Awesome 6, marked.js for markdown rendering, DOMPurify for XSS defense)

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```
Or with automatic reload during development:
```bash
npm run dev
```

### 3. Open in Browser
Visit: **[http://localhost:3000](http://localhost:3000)**

---

## 👤 Pre-Seeded Demo Accounts

The platform automatically populates initial demo users, sample articles, and comments on first launch:

| Email | Password | Role / Bio |
| :--- | :--- | :--- |
| `alice@example.com` | `password123` | Senior Frontend Engineer & UI enthusiast |
| `bob@example.com` | `password123` | Full-stack developer building modern web apps |
| `charlie@example.com` | `password123` | DevOps engineer & cloud architect |

*Tip: You can also use the **"⚡ Quick 1-Click Demo Login"** buttons directly inside the Sign In modal!*

---

## 📡 RESTful API Reference

### Authentication Endpoints
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user | No |
| `POST` | `/api/auth/login` | Log in and receive JWT token | No |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Yes (Bearer Token) |
| `PUT` | `/api/auth/profile` | Update profile bio and avatar | Yes (Bearer Token) |
| `GET` | `/api/auth/demo-users`| List demo accounts | No |

### Blog Post Endpoints
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/posts` | List posts (Supports `?search=`, `?tag=`, `?author=`) | No |
| `GET` | `/api/posts/:id` | Get single post details with author info | No |
| `POST` | `/api/posts` | Create new post | Yes (Bearer Token) |
| `PUT` | `/api/posts/:id` | Update post | Yes (Author Only) |
| `DELETE`| `/api/posts/:id` | Delete post and cascade comments | Yes (Author Only) |
| `POST` | `/api/posts/:id/like` | Toggle like on post | Yes (Bearer Token) |

### Comment Endpoints
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/posts/:postId/comments` | List all comments for a post | No |
| `POST` | `/api/posts/:postId/comments` | Add comment to post | Yes (Bearer Token) |
| `DELETE`| `/api/comments/:id` | Delete comment | Yes (Comment or Post Author) |

---

## 🧪 Automated Testing

Run the automated integration test suite:
```bash
npm test
```
Tests cover:
- User registration & login token issuance
- Token verification via `/api/auth/me`
- Posts query with filters
- Post creation, update, and author validation
- Comment creation, retrieval, and cascade deletion
