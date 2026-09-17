// Authentication State and Modal Controller
const auth = {
  user: null,

  async init() {
    this.bindEvents();
    
    // Check if we have an existing token
    const token = api.getToken();
    if (token) {
      try {
        const res = await api.get('/auth/me');
        this.user = res.user;
        api.setCurrentUser(this.user);
      } catch (err) {
        console.warn('Session expired or invalid token');
        api.clearToken();
        this.user = null;
      }
    } else {
      this.user = null;
    }

    this.renderHeader();
  },

  bindEvents() {
    // Auth Modal tab switching
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');

    if (tabLogin && tabRegister) {
      tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('border-indigo-600', 'text-indigo-600');
        tabLogin.classList.remove('border-transparent', 'text-slate-500');
        tabRegister.classList.remove('border-indigo-600', 'text-indigo-600');
        tabRegister.classList.add('border-transparent', 'text-slate-500');

        formLogin.classList.remove('hidden');
        formRegister.classList.add('hidden');
      });

      tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('border-indigo-600', 'text-indigo-600');
        tabRegister.classList.remove('border-transparent', 'text-slate-500');
        tabLogin.classList.remove('border-indigo-600', 'text-indigo-600');
        tabLogin.classList.add('border-transparent', 'text-slate-500');

        formRegister.classList.remove('hidden');
        formLogin.classList.add('hidden');
      });
    }

    // Form Submissions
    if (formLogin) {
      formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const submitBtn = formLogin.querySelector('button[type="submit"]');

        try {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Signing In...';
          const data = await api.post('/auth/login', { email, password });
          api.setToken(data.token);
          api.setCurrentUser(data.user);
          this.user = data.user;
          this.closeAuthModal();
          this.renderHeader();
          app.showToast(`Welcome back, ${data.user.username}!`, 'success');
          app.refreshCurrentView();
        } catch (err) {
          app.showToast(err.message, 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign In';
        }
      });
    }

    if (formRegister) {
      formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const bio = document.getElementById('reg-bio').value;
        const submitBtn = formRegister.querySelector('button[type="submit"]');

        try {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Creating Account...';
          const data = await api.post('/auth/register', { username, email, password, bio });
          api.setToken(data.token);
          api.setCurrentUser(data.user);
          this.user = data.user;
          this.closeAuthModal();
          this.renderHeader();
          app.showToast(`Account created! Welcome, ${data.user.username}!`, 'success');
          app.refreshCurrentView();
        } catch (err) {
          app.showToast(err.message, 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Account';
        }
      });
    }

    // Modal close buttons
    const closeBtn = document.getElementById('btn-close-auth-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeAuthModal());
    }

    const modalBackdrop = document.getElementById('auth-modal');
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) {
          this.closeAuthModal();
        }
      });
    }

    // Listen for expired token
    window.addEventListener('auth:expired', () => {
      this.user = null;
      this.renderHeader();
      app.showToast('Your session has expired. Please sign in again.', 'info');
    });
  },

  openAuthModal(tab = 'login') {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    if (tab === 'register') {
      const tabRegister = document.getElementById('tab-register');
      if (tabRegister) tabRegister.click();
    } else {
      const tabLogin = document.getElementById('tab-login');
      if (tabLogin) tabLogin.click();
    }
  },

  closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('hidden');
  },

  async loginAsDemo(email) {
    try {
      const data = await api.post('/auth/login', { email, password: 'password123' });
      api.setToken(data.token);
      api.setCurrentUser(data.user);
      this.user = data.user;
      this.closeAuthModal();
      this.renderHeader();
      app.showToast(`Signed in as demo user ${data.user.username}!`, 'success');
      app.refreshCurrentView();
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  logout() {
    api.clearToken();
    this.user = null;
    this.renderHeader();
    app.showToast('You have been signed out.', 'info');
    app.navigateTo('feed');
  },

  renderHeader() {
    const guestNav = document.getElementById('nav-guest');
    const userNav = document.getElementById('nav-user');
    const userAvatar = document.getElementById('header-user-avatar');
    const userName = document.getElementById('header-user-name');
    const userDropdownName = document.getElementById('dropdown-user-name');
    const userDropdownEmail = document.getElementById('dropdown-user-email');

    if (!guestNav || !userNav) return;

    if (this.user) {
      guestNav.classList.add('hidden');
      userNav.classList.remove('hidden');

      if (userAvatar) {
        userAvatar.src = this.user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${this.user.username}`;
      }
      if (userName) {
        userName.textContent = this.user.username;
      }
      if (userDropdownName) {
        userDropdownName.textContent = this.user.username;
      }
      if (userDropdownEmail) {
        userDropdownEmail.textContent = this.user.email;
      }
    } else {
      guestNav.classList.remove('hidden');
      userNav.classList.add('hidden');
    }
  }
};
