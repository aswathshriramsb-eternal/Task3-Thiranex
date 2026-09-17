const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new DatabaseSync(dbPath);

// Enable WAL mode & foreign key constraints
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      bio TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      cover_image TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      author_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      author_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(post_id, user_id),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
    CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
    CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
    CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);
    CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);
  `);

  seedInitialData();
  seedAdditionalStories();
}

function seedInitialData() {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (countRow && countRow.count > 0) {
    return; // Users already exist
  }

  console.log('Seeding initial demo users and stories...');
  const passwordHash = bcrypt.hashSync('password123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password_hash, bio, avatar_url)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertUser.run(
    'alice',
    'alice@example.com',
    passwordHash,
    'Senior Frontend Engineer & UI enthusiast. Writing about modern web, micro-interactions, and design systems.',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
  );

  insertUser.run(
    'bob',
    'bob@example.com',
    passwordHash,
    'Full-stack developer building scalable applications and exploring local AI models on the edge.',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
  );

  insertUser.run(
    'charlie',
    'charlie@example.com',
    passwordHash,
    'DevOps engineer, cloud architect, and cybersecurity practitioner passionate about zero-trust systems.',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80'
  );

  const insertPost = db.prepare(`
    INSERT INTO posts (title, content, excerpt, cover_image, tags, author_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  insertPost.run(
    'Mastering Full-Stack Architecture in 2026',
    `Building modern web applications requires a holistic view of both client and server layers. From responsive layouts to robust RESTful APIs, modern software design prioritizes simplicity, clean separation of concerns, and rapid user feedback.

### Key Principles

1. **Keep State Predictable**: Whether on the backend database or client-side application state, clear boundaries prevent race conditions.
2. **RESTful Consistency**: Maintain predictable URL hierarchies (\`/api/posts\`, \`/api/posts/:id/comments\`) and semantic HTTP methods (\`GET\`, \`POST\`, \`PUT\`, \`DELETE\`).
3. **Responsive Aesthetics**: A polished user interface builds trust with users immediately.

Embracing these concepts allows engineering teams to ship features quickly without sacrificing maintainability.`,
    'A deep dive into clean API design, component architecture, and modern full-stack engineering practices.',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=900&auto=format&fit=crop&q=80',
    JSON.stringify(['Architecture', 'WebDev', 'Tutorials']),
    1,
    '-4 days'
  );

  insertPost.run(
    'Why Embedded SQLite is Taking Over Modern Apps',
    `For years, conventional wisdom dictated that any serious production app must connect to a separate database server over the network. Today, embedded databases like SQLite have proven that keeping data close to your application code provides unmatched latency and operational simplicity.

### Advantages of Embedded SQLite

- **Zero Network Latency**: Queries execute via in-process memory and direct file operations.
- **Trivial Backups**: A single \`.sqlite\` file contains all relational data and tables.
- **WAL Mode Performance**: Write-Ahead Logging allows concurrent readers and high throughput writers.

Node.js v22+ and v24 now ship with built-in \`node:sqlite\`, allowing developers to build robust full-stack applications with zero external database dependencies!`,
    'Discover how embedded databases provide incredible speed, low operational overhead, and simplified deployments.',
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&auto=format&fit=crop&q=80',
    JSON.stringify(['Database', 'SQLite', 'NodeJS']),
    2,
    '-3 days'
  );

  insertPost.run(
    'Designing Delightful User Experiences with Micro-Interactions',
    `Great software distinguishes itself not merely through raw features, but through how enjoyable it feels to use. Micro-interactions—such as subtle button hover states, skeleton loading screens, and smooth modal transitions—guide the user and make an application feel responsive and alive.

When crafting comments, likes, or post editor interfaces, giving instant visual feedback is crucial. Feedback should be informative, unobtrusive, and elegant.`,
    'Explore how subtle animations, thoughtful feedback, and micro-interactions elevate your web application.',
    'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=900&auto=format&fit=crop&q=80',
    JSON.stringify(['Design', 'UI/UX', 'Frontend']),
    1,
    '-2 days'
  );
}

function seedAdditionalStories() {
  const insertPost = db.prepare(`
    INSERT INTO posts (title, content, excerpt, cover_image, tags, author_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  const insertComment = db.prepare(`
    INSERT INTO comments (post_id, author_id, content, created_at)
    VALUES (?, ?, ?, datetime('now', ?))
  `);

  const insertLike = db.prepare(`
    INSERT OR IGNORE INTO likes (post_id, user_id)
    VALUES (?, ?)
  `);

  // Story 4: The Rise of Local AI
  const existing4 = db.prepare('SELECT id FROM posts WHERE title = ?').get('The Rise of Local AI: Running Small Language Models in the Browser');
  if (!existing4) {
    const res4 = insertPost.run(
      'The Rise of Local AI: Running Small Language Models in the Browser',
      `The paradigm of artificial intelligence is rapidly shifting from centralized cloud APIs to client-side edge computing. With WebGPU reaching maturity across all major browsers and WebAssembly SIMD delivering near-native performance, running lightweight LLMs and vision models entirely on user hardware is no longer science fiction.

### Why Run Models Client-Side?

1. **Absolute Privacy**: Zero user tokens, documents, or prompts leave the user's browser.
2. **Zero Server Costs**: The client provides the compute, eliminating expensive GPU cluster hosting costs for application creators.
3. **Offline Capability**: Web applications continue summarizing, translating, and generating text without an active internet connection.

Technologies like ONNX Runtime Web and transformers.js make it remarkably easy to plug local inference directly into standard JavaScript workflows.`,
      'Explore how WebGPU and WebAssembly enable private, zero-latency inference directly inside modern web browsers.',
      'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=900&auto=format&fit=crop&q=80',
      JSON.stringify(['AI', 'WebDev', 'Innovation']),
      2,
      '-36 hours'
    );
    const pId4 = Number(res4.lastInsertRowid);
    insertComment.run(pId4, 1, 'The privacy implications of client-side models are massive for enterprise healthcare and finance.', '-28 hours');
    insertComment.run(pId4, 3, 'Tested transformers.js recently in Chrome with WebGPU—inference speeds were surprisingly smooth!', '-20 hours');
    insertComment.run(pId4, 2, 'Thanks for reading! In an upcoming post I will share a live code demo combining WebGPU with embeddings.', '-12 hours');
    insertLike.run(pId4, 1);
    insertLike.run(pId4, 3);
  }

  // Story 5: Docker & Containerization
  const existing5 = db.prepare('SELECT id FROM posts WHERE title = ?').get('Zero to Hero with Docker & Container Orchestration');
  if (!existing5) {
    const res5 = insertPost.run(
      'Zero to Hero with Docker & Container Orchestration',
      `Packaging applications reliably across development, staging, and production environments has always been one of software engineering's toughest hurdles. Containerization with Docker solves the classic "it works on my machine" dilemma.

### Golden Rules for Dockerfiles

- **Use Multi-Stage Builds**: Compile your assets and binaries in a builder image, then copy only the production artifacts into a featherweight runtime container (like Alpine or distroless).
- **Order Layers by Change Frequency**: Place infrequently changing steps (like \`package.json\` and \`npm install\`) before copying source code to maximize build cache hits.
- **Never Run as Root**: Always define a non-root user (\`USER node\`) inside your production images to follow the principle of least privilege.

Following these simple practices cuts container image sizes from 1.2GB down to under 120MB while significantly improving deployment security.`,
      'Essential best practices for crafting lean, secure, and production-ready container images.',
      'https://images.unsplash.com/photo-1605745341112-85968b19335b?w=900&auto=format&fit=crop&q=80',
      JSON.stringify(['DevOps', 'Docker', 'Cloud']),
      3,
      '-30 hours'
    );
    const pId5 = Number(res5.lastInsertRowid);
    insertComment.run(pId5, 2, 'Multi-stage builds saved our team gigabytes of Docker registry storage. Essential read!', '-22 hours');
    insertComment.run(pId5, 1, 'Also don’t forget .dockerignore! Accidentally copying node_modules into the build context slows down builds significantly.', '-16 hours');
    insertLike.run(pId5, 1);
    insertLike.run(pId5, 2);
  }

  // Story 6: Demystifying Web Security
  const existing6 = db.prepare('SELECT id FROM posts WHERE title = ?').get('Demystifying Web Security: Common Pitfalls & How to Avoid Them');
  if (!existing6) {
    const res6 = insertPost.run(
      'Demystifying Web Security: Common Pitfalls & How to Avoid Them',
      `Security should never be treated as an afterthought or a feature bolted onto an existing application right before launch. Developing a defensive security posture ensures your users' personal data and credentials remain protected at all times.

### Top Web Vulnerabilities and Defenses

1. **SQL Injection**: Never concatenate unvalidated user inputs directly into query strings. Always use parameterized queries (prepared statements), which treat input strictly as literals.
2. **Cross-Site Scripting (XSS)**: Always sanitize HTML content before rendering and ensure appropriate \`Content-Security-Policy\` (CSP) headers are configured.
3. **Broken Authentication**: Store passwords with slow, adaptive cryptographic hashing functions such as bcrypt, Argon2, or PBKDF2 with appropriate salt rounds.
4. **Cross-Site Request Forgery (CSRF)**: Use SameSite cookie attributes and anti-CSRF tokens for sensitive state-changing operations.

Building security awareness into every layer of development is the hallmark of senior engineering.`,
      'A practical guide to securing web applications against injection, XSS, and authentication attacks.',
      'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=900&auto=format&fit=crop&q=80',
      JSON.stringify(['Security', 'WebDev', 'BestPractices']),
      3,
      '-24 hours'
    );
    const pId6 = Number(res6.lastInsertRowid);
    insertComment.run(pId6, 1, 'Prepared statements are so easy to use in modern engines that there is really no excuse for SQL injection anymore.', '-18 hours');
    insertComment.run(pId6, 2, 'Great summary. Storing password hashes with bcrypt or argon2 is non-negotiable.', '-10 hours');
    insertLike.run(pId6, 1);
    insertLike.run(pId6, 2);
  }

  // Story 7: CSS Grid vs Flexbox
  const existing7 = db.prepare('SELECT id FROM posts WHERE title = ?').get('CSS Grid vs Flexbox: When to Use Which in Modern Layouts');
  if (!existing7) {
    const res7 = insertPost.run(
      'CSS Grid vs Flexbox: When to Use Which in Modern Layouts',
      `Frontend developers often ask: "Should I use Flexbox or CSS Grid for this layout?" The answer is that both are complementary tools designed for distinctly different dimensional problems.

### The Mental Model

- **Flexbox is One-Dimensional (1D)**: Ideal for laying out elements along either a row *or* a column. Use it for navigation bars, button clusters, form fields with labels, and centering items.
- **CSS Grid is Two-Dimensional (2D)**: Designed for laying out items along rows *and* columns simultaneously. Use it for overall page templates, dashboard widget arrangements, and responsive photo or card galleries.

### The Power Combo

The cleanest UI architectures use Grid for the macro layout (such as post grids and site shells) and Flexbox for the micro components (such as author avatars paired with text and badges).`,
      'Master the distinction between one-dimensional and two-dimensional CSS layouts for clean responsive design.',
      'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=900&auto=format&fit=crop&q=80',
      JSON.stringify(['Design', 'CSS', 'Frontend']),
      1,
      '-18 hours'
    );
    const pId7 = Number(res7.lastInsertRowid);
    insertComment.run(pId7, 2, 'The 1D vs 2D explanation is the clearest mental model I have come across!', '-14 hours');
    insertComment.run(pId7, 3, 'CSS Grid \`repeat(auto-fit, minmax(280px, 1fr))\` completely eliminated the need for manual media queries in my card lists.', '-8 hours');
    insertLike.run(pId7, 2);
    insertLike.run(pId7, 3);
  }

  // Story 8: Lessons Learned from 10 Years in Software
  const existing8 = db.prepare('SELECT id FROM posts WHERE title = ?').get('Lessons Learned from 10 Years as a Software Engineer');
  if (!existing8) {
    const res8 = insertPost.run(
      'Lessons Learned from 10 Years as a Software Engineer',
      `After a decade of building web applications, migrating legacy services, and mentoring junior engineers, technology stacks change constantly, but foundational principles remain remarkably timeless.

### Core Takeaways

1. **Clear Code Beats Clever Code**: The code you write today will be read dozens of times by other engineers and your future self. Prioritize readability, explicit naming, and maintainability over cryptic one-liners.
2. **Invest in Communication**: Software development is fundamentally a team sport. Being able to articulate technical tradeoffs, listen to product requirements, and document systems clearly creates 10x more impact than solitary coding.
3. **Automated Testing is Peace of Mind**: Writing tests upfront may feel like extra work, but it pays exponential dividends when refactoring or shipping high-stakes updates to production.
4. **Stay Curious, Stay Humble**: The most respected engineers aren't the ones who claim to know everything—they are the ones who aren't afraid to say "I don't know yet, but let's investigate."`,
      'Timeless wisdom on communication, code simplicity, automated testing, and long-term career resilience.',
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&auto=format&fit=crop&q=80',
      JSON.stringify(['Career', 'Mentorship', 'Engineering']),
      1,
      '-12 hours'
    );
    const pId8 = Number(res8.lastInsertRowid);
    insertComment.run(pId8, 2, 'Point #1 hits so close to home. Clever code is fun to write, but painful to debug at 2 AM!', '-9 hours');
    insertComment.run(pId8, 3, 'Investing in team communication and clean documentation changed my entire engineering trajectory.', '-6 hours');
    insertComment.run(pId8, 1, 'Thanks everyone! Glad these reflections resonated with you all.', '-3 hours');
    insertLike.run(pId8, 2);
    insertLike.run(pId8, 3);
  }

  // Story 9: Async JavaScript
  const existing9 = db.prepare('SELECT id FROM posts WHERE title = ?').get('Async Programming in JavaScript: From Callbacks to Async/Await');
  if (!existing9) {
    const res9 = insertPost.run(
      'Async Programming in JavaScript: From Callbacks to Async/Await',
      `JavaScript's single-threaded event loop is both its greatest superpower and a common source of confusion for newcomers. Over the past fifteen years, asynchronous handling in JavaScript has evolved dramatically.

### The Three Eras of Async

1. **The Callback Era**: Nested callback functions often produced the infamous "callback hell" or "pyramid of doom", making error propagation notoriously fragile.
2. **The Promise Era**: Introduced standard \`.then()\` and \`.catch()\` chains, enabling clean composition, \`Promise.all()\`, and centralized error rejection.
3. **The Async/Await Era**: Syntactic sugar built atop Promises that allows asynchronous code to be written and read like synchronous sequential code, complete with \`try/catch\` blocks.

Understanding the event loop, microtask queues (Promises), and macrotask queues (setTimeout, I/O) unlocks true mastery of full-stack Node.js development.`,
      'Trace the evolution of asynchronous JavaScript and discover how the event loop powers modern high-performance web applications.',
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=900&auto=format&fit=crop&q=80',
      JSON.stringify(['JavaScript', 'WebDev', 'Tutorials']),
      2,
      '-6 hours'
    );
    const pId9 = Number(res9.lastInsertRowid);
    insertComment.run(pId9, 1, 'Async/await made error handling with standard try/catch so clean and intuitive.', '-4 hours');
    insertComment.run(pId9, 3, 'Great breakdown of microtasks vs macrotasks. The event loop is fascinating under the hood.', '-2 hours');
    insertLike.run(pId9, 1);
    insertLike.run(pId9, 3);
  }

  // Seed initial likes on original 3 posts if not present
  insertLike.run(1, 2);
  insertLike.run(1, 3);
  insertLike.run(2, 1);
  insertLike.run(2, 3);
  insertLike.run(3, 2);
}

// Run schema and seed
initDatabase();

module.exports = db;
