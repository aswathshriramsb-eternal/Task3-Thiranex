// Core Frontend Application Logic for Blog Platform

const app = {
  currentView: 'feed', // 'feed' | 'post' | 'editor' | 'my-posts'
  currentPostId: null,
  editingPostId: null,
  activeTag: null,
  activeAuthor: null,
  searchQuery: '',
  posts: [],

  async init() {
    await auth.init();
    this.bindEvents();
    this.handleRoute();
    window.addEventListener('hashchange', () => this.handleRoute());
  },

  bindEvents() {
    // Navigation items
    document.getElementById('nav-brand')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.activeTag = null;
      this.activeAuthor = null;
      this.searchQuery = '';
      const s = document.getElementById('search-input');
      if (s) s.value = '';
      this.navigateTo('feed');
    });

    document.getElementById('btn-write-post')?.addEventListener('click', () => {
      if (!auth.user) {
        auth.openAuthModal('login');
        this.showToast('Please sign in to write a post.', 'info');
        return;
      }
      this.openEditor();
    });

    document.getElementById('nav-btn-login')?.addEventListener('click', () => {
      auth.openAuthModal('login');
    });

    document.getElementById('nav-btn-register')?.addEventListener('click', () => {
      auth.openAuthModal('register');
    });

    document.getElementById('btn-logout')?.addEventListener('click', (e) => {
      e.preventDefault();
      auth.logout();
    });

    document.getElementById('btn-my-posts')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.navigateTo('my-posts');
    });

    // Profile Dropdown Toggle
    const profileBtn = document.getElementById('btn-profile-menu');
    const profileDropdown = document.getElementById('profile-dropdown');
    if (profileBtn && profileDropdown) {
      profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('hidden');
      });

      document.addEventListener('click', () => {
        profileDropdown.classList.add('hidden');
      });
    }

    // Profile Edit Form Submit
    const profileForm = document.getElementById('profile-edit-form');
    if (profileForm) {
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSaveProfile();
      });
    }

    const avatarInput = document.getElementById('profile-edit-avatar');
    const avatarPreview = document.getElementById('profile-modal-avatar-preview');
    if (avatarInput && avatarPreview) {
      avatarInput.addEventListener('input', (e) => {
        avatarPreview.src = e.target.value.trim() || `https://api.dicebear.com/7.x/bottts/svg?seed=${auth.user?.username || 'user'}`;
      });
    }

    // Search bar with debounce
    const searchInput = document.getElementById('search-input');
    let debounceTimer;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.searchQuery = e.target.value.trim();
          this.loadPosts(this.currentView === 'my-posts');
        }, 300);
      });
    }

    // Editor form handling
    const editorForm = document.getElementById('post-editor-form');
    if (editorForm) {
      editorForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSavePost();
      });
    }

    // Editor tab switcher (Write vs Preview)
    const tabEdit = document.getElementById('editor-tab-edit');
    const tabPreview = document.getElementById('editor-tab-preview');
    const editArea = document.getElementById('editor-content-area');
    const previewArea = document.getElementById('editor-preview-area');

    if (tabEdit && tabPreview) {
      tabEdit.addEventListener('click', () => {
        tabEdit.classList.add('bg-indigo-600', 'text-white');
        tabEdit.classList.remove('text-slate-600', 'hover:bg-slate-100');
        tabPreview.classList.remove('bg-indigo-600', 'text-white');
        tabPreview.classList.add('text-slate-600', 'hover:bg-slate-100');
        editArea.classList.remove('hidden');
        previewArea.classList.add('hidden');
      });

      tabPreview.addEventListener('click', () => {
        tabPreview.classList.add('bg-indigo-600', 'text-white');
        tabPreview.classList.remove('text-slate-600', 'hover:bg-slate-100');
        tabEdit.classList.remove('bg-indigo-600', 'text-white');
        tabEdit.classList.add('text-slate-600', 'hover:bg-slate-100');
        editArea.classList.add('hidden');
        previewArea.classList.remove('hidden');

        const content = document.getElementById('post-content').value;
        previewArea.innerHTML = this.renderMarkdown(content || '*Nothing to preview yet.*');
      });
    }

    // Preset cover image buttons in editor
    document.querySelectorAll('.preset-cover-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const url = btn.getAttribute('data-url');
        const input = document.getElementById('post-cover');
        if (input && url) {
          input.value = url;
          this.showToast('Cover image selected!', 'info');
        }
      });
    });

    // Editor cancel
    document.getElementById('btn-cancel-editor')?.addEventListener('click', () => {
      this.closeEditor();
    });

    // Back button in post detail
    document.getElementById('btn-back-to-feed')?.addEventListener('click', () => {
      this.navigateTo('feed');
    });

    // Add comment form & character counter
    const commentInput = document.getElementById('comment-input');
    const commentCharCount = document.getElementById('comment-char-count');
    if (commentInput && commentCharCount) {
      commentInput.addEventListener('input', (e) => {
        commentCharCount.textContent = `${e.target.value.length} / 2000`;
      });
    }

    const commentForm = document.getElementById('new-comment-form');
    if (commentForm) {
      commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleAddComment();
      });
    }

    // Comment prompt login button
    document.getElementById('btn-comment-login')?.addEventListener('click', () => {
      auth.openAuthModal('login');
    });
  },

  handleRoute() {
    const hash = window.location.hash;
    if (hash.startsWith('#post/')) {
      const postId = hash.replace('#post/', '');
      this.showPostView(postId);
    } else if (hash === '#my-posts') {
      if (!auth.user) {
        this.navigateTo('feed');
      } else {
        this.showMyPostsView();
      }
    } else {
      this.showFeedView();
    }
  },

  navigateTo(view, param = null) {
    if (view === 'feed') {
      window.location.hash = '';
      this.showFeedView();
    } else if (view === 'post' && param) {
      window.location.hash = `#post/${param}`;
      this.showPostView(param);
    } else if (view === 'my-posts') {
      window.location.hash = '#my-posts';
      this.showMyPostsView();
    }
  },

  refreshCurrentView() {
    this.handleRoute();
  },

  // FEED VIEW
  async showFeedView() {
    this.currentView = 'feed';
    this.currentPostId = null;

    document.getElementById('view-feed').classList.remove('hidden');
    document.getElementById('view-post-detail').classList.add('hidden');
    document.getElementById('hero-section').classList.remove('hidden');

    const feedTitle = document.getElementById('feed-section-title');
    if (feedTitle) {
      if (this.activeAuthor) {
        feedTitle.innerHTML = `Stories by <span class="text-indigo-600">@${this.escapeHtml(this.activeAuthor)}</span> <button onclick="app.clearFilters()" class="ml-2 text-xs font-semibold text-slate-400 hover:text-slate-600 underline">Clear</button>`;
      } else if (this.activeTag) {
        feedTitle.innerHTML = `Articles tagged with <span class="text-indigo-600">#${this.escapeHtml(this.activeTag)}</span> <button onclick="app.clearFilters()" class="ml-2 text-xs font-semibold text-slate-400 hover:text-slate-600 underline">Clear</button>`;
      } else {
        feedTitle.textContent = 'Latest Stories';
      }
    }

    await this.loadPosts();
  },

  // MY POSTS VIEW
  async showMyPostsView() {
    this.currentView = 'my-posts';
    this.currentPostId = null;
    this.activeAuthor = null;
    this.activeTag = null;

    document.getElementById('view-feed').classList.remove('hidden');
    document.getElementById('view-post-detail').classList.add('hidden');
    document.getElementById('hero-section').classList.add('hidden');

    const feedTitle = document.getElementById('feed-section-title');
    if (feedTitle) {
      feedTitle.innerHTML = `My Published Stories <span class="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2.5 py-1 rounded-full ml-2">Author: @${this.escapeHtml(auth.user?.username || '')}</span>`;
    }

    await this.loadPosts(true);
  },

  clearFilters() {
    this.activeTag = null;
    this.activeAuthor = null;
    this.searchQuery = '';
    const s = document.getElementById('search-input');
    if (s) s.value = '';
    this.setTagFilter(null);
  },

  async loadPosts(onlyMine = false) {
    const container = document.getElementById('posts-container');
    const loadingIndicator = document.getElementById('posts-loading');
    const emptyState = document.getElementById('posts-empty');

    if (loadingIndicator) loadingIndicator.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');
    if (container) container.innerHTML = '';

    try {
      let query = '';
      const params = new URLSearchParams();

      if (this.searchQuery) {
        params.append('search', this.searchQuery);
      }
      if (this.activeTag && !onlyMine) {
        params.append('tag', this.activeTag);
      }
      if (this.activeAuthor && !onlyMine) {
        params.append('author', this.activeAuthor);
      }
      if (onlyMine && auth.user) {
        params.append('author', auth.user.id);
      }

      if (params.toString()) {
        query = `?${params.toString()}`;
      }

      const res = await api.get(`/posts${query}`);
      this.posts = res.posts;

      if (loadingIndicator) loadingIndicator.classList.add('hidden');

      if (!this.posts || this.posts.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
      }

      this.renderPosts(this.posts, container, onlyMine);
    } catch (err) {
      if (loadingIndicator) loadingIndicator.classList.add('hidden');
      this.showToast('Failed to load stories.', 'error');
    }
  },

  renderPosts(posts, container, isMyPosts = false) {
    container.innerHTML = posts.map(post => {
      const formattedDate = this.formatDate(post.created_at);
      const readTime = Math.max(1, Math.ceil(post.content.split(/\s+/).length / 180));
      const tagsHtml = (post.tags || []).slice(0, 3).map(tag => `
        <span class="inline-block bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-0.5 rounded-full hover:bg-indigo-100 transition-colors" onclick="event.stopPropagation(); app.setTagFilter('${this.escapeHtml(tag)}')">
          #${this.escapeHtml(tag)}
        </span>
      `).join(' ');

      const defaultCover = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&auto=format&fit=crop&q=80';
      const coverUrl = post.cover_image || defaultCover;

      const myPostActions = isMyPosts ? `
        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2" onclick="event.stopPropagation()">
          <button onclick="app.editPostById(${post.id})" class="text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
            <i class="fa-solid fa-pen-to-square"></i> Edit
          </button>
          <button onclick="app.deletePostById(${post.id})" class="text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors">
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        </div>
      ` : '';

      return `
        <article class="post-card bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm flex flex-col cursor-pointer" onclick="app.navigateTo('post', ${post.id})">
          <div class="h-48 overflow-hidden relative">
            <img src="${coverUrl}" alt="${this.escapeHtml(post.title)}" class="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500" loading="lazy" />
            <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-medium text-slate-700 flex items-center gap-1 shadow-sm">
              <i class="fa-regular fa-clock text-slate-500"></i> ${readTime} min read
            </div>
          </div>
          
          <div class="p-6 flex-1 flex flex-col justify-between">
            <div>
              <div class="flex flex-wrap gap-1.5 mb-3">
                ${tagsHtml}
              </div>
              <h3 class="text-xl font-bold text-slate-900 leading-snug mb-2 hover:text-indigo-600 transition-colors line-clamp-2">
                ${this.escapeHtml(post.title)}
              </h3>
              <p class="text-slate-600 text-sm line-clamp-3 mb-4 leading-relaxed">
                ${this.escapeHtml(post.excerpt || post.content)}
              </p>
            </div>

            <div>
              <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div class="flex items-center gap-2.5" onclick="event.stopPropagation(); app.setAuthorFilter('${this.escapeHtml(post.author.username)}')">
                  <img src="${post.author.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${post.author.username}`}" class="w-8 h-8 rounded-full object-cover border border-slate-200" alt="${this.escapeHtml(post.author.username)}" />
                  <div class="hover:underline">
                    <h4 class="text-xs font-semibold text-slate-800">${this.escapeHtml(post.author.username)}</h4>
                    <p class="text-[11px] text-slate-400">${formattedDate}</p>
                  </div>
                </div>

                <div class="flex items-center gap-1.5">
                  <div class="flex items-center gap-1 text-slate-500 text-xs font-medium bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                    <i class="fa-${post.user_has_liked ? 'solid text-rose-500' : 'regular text-slate-400'} fa-heart"></i>
                    <span>${post.likes_count || 0}</span>
                  </div>
                  <div class="flex items-center gap-1 text-slate-500 text-xs font-medium bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                    <i class="fa-regular fa-comment text-indigo-500"></i>
                    <span>${post.comment_count}</span>
                  </div>
                </div>
              </div>
              ${myPostActions}
            </div>
          </div>
        </article>
      `;
    }).join('');
  },

  setTagFilter(tag) {
    this.activeTag = tag;
    this.activeAuthor = null;
    document.querySelectorAll('.tag-chip').forEach(chip => {
      if ((tag === null && chip.dataset.tag === 'all') || chip.dataset.tag === tag) {
        chip.classList.add('bg-indigo-600', 'text-white');
        chip.classList.remove('bg-white', 'text-slate-600');
      } else {
        chip.classList.remove('bg-indigo-600', 'text-white');
        chip.classList.add('bg-white', 'text-slate-600');
      }
    });

    this.showFeedView();
  },

  setAuthorFilter(username) {
    this.activeAuthor = username;
    this.activeTag = null;
    this.showFeedView();
  },

  // SINGLE POST DETAIL VIEW
  async showPostView(postId) {
    this.currentView = 'post';
    this.currentPostId = Number(postId);

    document.getElementById('view-feed').classList.add('hidden');
    document.getElementById('view-post-detail').classList.remove('hidden');
    document.getElementById('hero-section').classList.add('hidden');

    window.scrollTo({ top: 0, behavior: 'smooth' });

    const postContentContainer = document.getElementById('post-article-container');
    postContentContainer.innerHTML = `
      <div class="text-center py-20 text-slate-500">
        <i class="fa-solid fa-spinner fa-spin text-3xl text-indigo-600 mb-4"></i>
        <p>Loading story...</p>
      </div>
    `;

    try {
      const res = await api.get(`/posts/${postId}`);
      const post = res.post;
      this.renderPostDetail(post);
      await this.loadComments(postId, post.author.id);
    } catch (err) {
      this.showToast('Story not found or unable to load.', 'error');
      this.navigateTo('feed');
    }
  },

  renderPostDetail(post) {
    const isAuthor = auth.user && auth.user.id === post.author.id;
    const formattedDate = this.formatDate(post.created_at);
    const readTime = Math.max(1, Math.ceil(post.content.split(/\s+/).length / 180));
    const defaultCover = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&auto=format&fit=crop&q=80';
    const coverUrl = post.cover_image || defaultCover;

    const tagsHtml = (post.tags || []).map(tag => `
      <span class="inline-block bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-xs px-3 py-1 rounded-full cursor-pointer transition-colors" onclick="app.setTagFilter('${this.escapeHtml(tag)}')">
        #${this.escapeHtml(tag)}
      </span>
    `).join(' ');

    const authorControls = isAuthor ? `
      <div class="flex items-center gap-2">
        <button onclick="app.editCurrentPost()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
          <i class="fa-solid fa-pen-to-square"></i> Edit
        </button>
        <button onclick="app.deleteCurrentPost()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors">
          <i class="fa-solid fa-trash"></i> Delete
        </button>
      </div>
    ` : '';

    const postContentContainer = document.getElementById('post-article-container');
    postContentContainer.innerHTML = `
      <article class="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
        <div class="h-72 sm:h-96 w-full overflow-hidden relative">
          <img src="${coverUrl}" alt="${this.escapeHtml(post.title)}" class="w-full h-full object-cover" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          <div class="absolute bottom-6 left-6 right-6 flex flex-wrap gap-2">
            ${tagsHtml}
          </div>
        </div>

        <div class="p-6 sm:p-10 max-w-3xl mx-auto">
          <h1 class="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight mb-6">
            ${this.escapeHtml(post.title)}
          </h1>

          <div class="flex flex-wrap items-center justify-between gap-4 pb-8 mb-8 border-b border-slate-200">
            <div class="flex items-center gap-3.5 cursor-pointer" onclick="app.setAuthorFilter('${this.escapeHtml(post.author.username)}')">
              <img src="${post.author.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${post.author.username}`}" class="w-12 h-12 rounded-full object-cover border-2 border-indigo-100" alt="${this.escapeHtml(post.author.username)}" />
              <div>
                <div class="font-bold text-slate-900 text-base hover:text-indigo-600 transition-colors">${this.escapeHtml(post.author.username)}</div>
                <div class="text-xs text-slate-500 flex items-center gap-2">
                  <span>Published ${formattedDate}</span>
                  <span>•</span>
                  <span><i class="fa-regular fa-clock"></i> ${readTime} min read</span>
                </div>
              </div>
            </div>

            ${authorControls}
          </div>

          <!-- Article Content Body -->
          <div class="article-content">
            ${this.renderMarkdown(post.content)}
          </div>

          <!-- Action & Reaction Bar -->
          <div class="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <!-- Like Button -->
              <button 
                id="post-like-btn" 
                onclick="app.toggleLikePost(${post.id})" 
                class="inline-flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${post.user_has_liked ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'}"
              >
                <i class="fa-${post.user_has_liked ? 'solid' : 'regular'} fa-heart text-base"></i>
                <span id="post-like-count" class="font-bold text-sm">${post.likes_count || 0}</span>
              </button>

              <!-- Share Button -->
              <button onclick="app.shareCurrentPost()" class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors text-sm font-semibold">
                <i class="fa-solid fa-share-nodes text-xs"></i> Share
              </button>
            </div>

            <a href="#comments-section" class="text-slate-500 hover:text-indigo-600 text-sm font-medium flex items-center gap-1.5">
              <i class="fa-regular fa-comment text-indigo-500"></i> ${post.comment_count} comments
            </a>
          </div>

          <!-- Author Bio & Credentials Box -->
          <div class="mt-10 p-6 bg-slate-50/80 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <img src="${post.author.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${post.author.username}`}" class="w-14 h-14 rounded-full object-cover border-2 border-indigo-200 flex-shrink-0" alt="${this.escapeHtml(post.author.username)}" />
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <h4 class="font-bold text-sm text-slate-900">${this.escapeHtml(post.author.username)}</h4>
                <span class="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">Author</span>
              </div>
              <p class="text-xs text-slate-600 mt-1 leading-relaxed">${this.escapeHtml(post.author.bio || 'Passionate software creator writing about engineering, technology, and modern web development.')}</p>
            </div>
            <button onclick="app.setAuthorFilter('${this.escapeHtml(post.author.username)}')" class="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 px-3.5 py-2 rounded-xl shadow-sm whitespace-nowrap transition-all hover:border-indigo-400">
              More by @${this.escapeHtml(post.author.username)} →
            </button>
          </div>

        </div>
      </article>
    `;

    // Render comment auth bar
    const commentAuthRequired = document.getElementById('comment-auth-required');
    const commentFormWrapper = document.getElementById('comment-form-wrapper');

    if (auth.user) {
      commentAuthRequired.classList.add('hidden');
      commentFormWrapper.classList.remove('hidden');

      const userAvatar = document.getElementById('comment-user-avatar');
      if (userAvatar) {
        userAvatar.src = auth.user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${auth.user.username}`;
      }
    } else {
      commentAuthRequired.classList.remove('hidden');
      commentFormWrapper.classList.add('hidden');
    }
  },

  async toggleLikePost(postId) {
    if (!auth.user) {
      auth.openAuthModal('login');
      this.showToast('Please sign in to like this story.', 'info');
      return;
    }

    try {
      const res = await api.post(`/posts/${postId}/like`, {});
      const btn = document.getElementById('post-like-btn');
      const countEl = document.getElementById('post-like-count');

      if (btn && countEl) {
        countEl.textContent = res.likes_count;
        const icon = btn.querySelector('i');
        if (res.liked) {
          btn.className = 'inline-flex items-center gap-2 px-4 py-2 rounded-full border transition-all bg-rose-50 border-rose-200 text-rose-600';
          icon.className = 'fa-solid fa-heart text-base animate-pulse';
        } else {
          btn.className = 'inline-flex items-center gap-2 px-4 py-2 rounded-full border transition-all bg-slate-50 border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200';
          icon.className = 'fa-regular fa-heart text-base';
        }
      }
      this.showToast(res.message, 'info');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  shareCurrentPost() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      this.showToast('Link copied to clipboard!', 'success');
    } else {
      this.showToast(window.location.href, 'info');
    }
  },

  // COMMENTS SECTION
  async loadComments(postId, postAuthorId) {
    const listContainer = document.getElementById('comments-list');
    const countBadge = document.getElementById('comments-count-badge');

    try {
      const res = await api.get(`/posts/${postId}/comments`);
      const comments = res.comments;

      if (countBadge) {
        countBadge.textContent = `${comments.length} comment${comments.length === 1 ? '' : 's'}`;
      }

      if (comments.length === 0) {
        listContainer.innerHTML = `
          <div class="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <i class="fa-regular fa-comments text-3xl text-slate-400 mb-2"></i>
            <p class="text-slate-600 font-medium">No comments yet.</p>
            <p class="text-slate-400 text-xs mt-1">Be the first to share your thoughts!</p>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = comments.map(c => {
        const canDelete = auth.user && (auth.user.id === c.author.id || auth.user.id === postAuthorId);
        const formattedTime = this.timeAgo(c.created_at);

        return `
          <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-4 transition-all hover:border-slate-300">
            <img src="${c.author.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${c.author.username}`}" class="w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0" alt="${this.escapeHtml(c.author.username)}" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-1.5">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-sm text-slate-900">${this.escapeHtml(c.author.username)}</span>
                  ${c.author.id === postAuthorId ? `<span class="bg-indigo-100 text-indigo-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">Author</span>` : ''}
                  <span class="text-xs text-slate-400">${formattedTime}</span>
                </div>
                ${canDelete ? `
                  <button onclick="app.deleteComment(${c.id})" class="text-slate-400 hover:text-rose-600 text-xs p-1 transition-colors" title="Delete comment">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                ` : ''}
              </div>
              <p class="text-slate-700 text-sm leading-relaxed whitespace-pre-line break-words">
                ${this.escapeHtml(c.content)}
              </p>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  },

  async handleAddComment() {
    if (!auth.user) {
      auth.openAuthModal('login');
      return;
    }

    const input = document.getElementById('comment-input');
    const content = input.value.trim();
    if (!content) return;

    const submitBtn = document.getElementById('btn-submit-comment');
    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Posting...';

      await api.post(`/posts/${this.currentPostId}/comments`, { content });
      input.value = '';
      const counter = document.getElementById('comment-char-count');
      if (counter) counter.textContent = '0 / 2000';
      this.showToast('Comment posted successfully!', 'success');

      // Reload comments and post detail
      const postRes = await api.get(`/posts/${this.currentPostId}`);
      await this.loadComments(this.currentPostId, postRes.post.author.id);
    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane text-xs"></i> Post Comment';
    }
  },

  async deleteComment(commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await api.delete(`/comments/${commentId}`);
      this.showToast('Comment deleted.', 'info');
      const postRes = await api.get(`/posts/${this.currentPostId}`);
      await this.loadComments(this.currentPostId, postRes.post.author.id);
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // POST EDITOR (CREATE / EDIT)
  openEditor(existingPost = null) {
    this.editingPostId = existingPost ? existingPost.id : null;
    const modal = document.getElementById('post-editor-modal');
    const modalTitle = document.getElementById('editor-modal-title');
    const submitBtn = document.getElementById('editor-submit-btn');

    document.getElementById('post-title').value = existingPost ? existingPost.title : '';
    document.getElementById('post-tags').value = existingPost ? (existingPost.tags || []).join(', ') : '';
    document.getElementById('post-cover').value = existingPost ? existingPost.cover_image : '';
    document.getElementById('post-content').value = existingPost ? existingPost.content : '';

    if (existingPost) {
      modalTitle.textContent = 'Edit Story';
      submitBtn.textContent = 'Update Story';
    } else {
      modalTitle.textContent = 'Write a New Story';
      submitBtn.textContent = 'Publish Story';
    }

    // Reset tabs
    document.getElementById('editor-tab-edit').click();
    modal.classList.remove('hidden');
  },

  closeEditor() {
    const modal = document.getElementById('post-editor-modal');
    modal.classList.add('hidden');
    this.editingPostId = null;
  },

  async editCurrentPost() {
    try {
      const res = await api.get(`/posts/${this.currentPostId}`);
      this.openEditor(res.post);
    } catch (err) {
      this.showToast('Failed to load post for editing.', 'error');
    }
  },

  async editPostById(postId) {
    try {
      const res = await api.get(`/posts/${postId}`);
      this.openEditor(res.post);
    } catch (err) {
      this.showToast('Failed to load story for editing.', 'error');
    }
  },

  async deletePostById(postId) {
    if (!confirm('Are you sure you want to delete this story?')) return;
    try {
      await api.delete(`/posts/${postId}`);
      this.showToast('Story deleted.', 'info');
      this.loadPosts(this.currentView === 'my-posts');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async handleSavePost() {
    const title = document.getElementById('post-title').value.trim();
    const tags = document.getElementById('post-tags').value.trim();
    const cover_image = document.getElementById('post-cover').value.trim();
    const content = document.getElementById('post-content').value.trim();

    if (!title) {
      this.showToast('Please provide a story title.', 'error');
      return;
    }
    if (!content) {
      this.showToast('Please write some content for your story.', 'error');
      return;
    }

    const payload = {
      title,
      content,
      cover_image,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []
    };

    const submitBtn = document.getElementById('editor-submit-btn');
    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Saving...';

      if (this.editingPostId) {
        const res = await api.put(`/posts/${this.editingPostId}`, payload);
        this.showToast('Story updated successfully!', 'success');
        this.closeEditor();
        this.navigateTo('post', this.editingPostId);
      } else {
        const res = await api.post('/posts', payload);
        this.showToast('Story published successfully!', 'success');
        this.closeEditor();
        this.navigateTo('post', res.post.id);
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = this.editingPostId ? 'Update Story' : 'Publish Story';
    }
  },

  async deleteCurrentPost() {
    if (!confirm('Are you sure you want to permanently delete this story and all its comments?')) {
      return;
    }

    try {
      await api.delete(`/posts/${this.currentPostId}`);
      this.showToast('Story deleted successfully.', 'info');
      this.navigateTo('feed');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // USER PROFILE MODAL
  openProfileModal() {
    if (!auth.user) return;
    const modal = document.getElementById('profile-modal');
    const avatarInput = document.getElementById('profile-edit-avatar');
    const bioInput = document.getElementById('profile-edit-bio');
    const avatarPreview = document.getElementById('profile-modal-avatar-preview');

    avatarInput.value = auth.user.avatar_url || '';
    bioInput.value = auth.user.bio || '';
    avatarPreview.src = auth.user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${auth.user.username}`;

    modal.classList.remove('hidden');
  },

  closeProfileModal() {
    document.getElementById('profile-modal')?.classList.add('hidden');
  },

  async handleSaveProfile() {
    const avatar_url = document.getElementById('profile-edit-avatar').value.trim();
    const bio = document.getElementById('profile-edit-bio').value.trim();
    const submitBtn = document.getElementById('btn-save-profile');

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
      const res = await api.put('/auth/profile', { avatar_url, bio });
      auth.user = res.user;
      api.setCurrentUser(res.user);
      auth.renderHeader();
      this.closeProfileModal();
      this.showToast('Profile updated successfully!', 'success');
      this.refreshCurrentView();
    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Profile';
    }
  },

  // UTILITIES
  renderMarkdown(text) {
    if (window.marked) {
      const rawHtml = window.marked.parse(text);
      if (window.DOMPurify) {
        return window.DOMPurify.sanitize(rawHtml);
      }
      return rawHtml;
    }

    // Built-in fallback markdown renderer
    let html = this.escapeHtml(text);
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');
    html = html.split('\n\n').map(p => {
      p = p.trim();
      if (!p) return '';
      if (p.startsWith('<h') || p.startsWith('<blockquote') || p.startsWith('<pre')) return p;
      return `<p>${p.replace(/\n/g, '<br/>')}</p>`;
    }).join('');

    return html;
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  },

  timeAgo(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return this.formatDate(dateStr);
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = '<i class="fa-solid fa-circle-info text-blue-500"></i>';
    if (type === 'success') {
      icon = '<i class="fa-solid fa-circle-check text-emerald-500"></i>';
    } else if (type === 'error') {
      icon = '<i class="fa-solid fa-circle-exclamation text-rose-500"></i>';
    }

    toast.innerHTML = `
      ${icon}
      <div class="flex-1 text-slate-800 text-sm">${this.escapeHtml(message)}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
