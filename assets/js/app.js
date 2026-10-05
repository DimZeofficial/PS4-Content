/**
 * Main Application Orchestrator
 * Coordinates database, animations, theme switching, settings, profile setup, and page interactions.
 */
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Database
  const db = new GameDatabase();
  await db.load();

  // 2. Initial UI Sync (Profile, Wishlist Badges, Themes, Settings)
  UI.applySettings();
  UI.syncProfileUI();
  UI.syncWishlistBadges();

  // 3. First-time visit: Prompt to choose username & avatar at the start
  if (!localStorage.getItem('ps4_username')) {
    setTimeout(() => {
      UI.openProfileModal();
    }, 400);
  }

  // 4. Wire Profile modal triggers
  const profileTriggers = [
    document.getElementById('userProfileBtn'),
    document.getElementById('profileOpenBtn'),
    document.getElementById('sidebarProfileLink')
  ];
  profileTriggers.forEach(btn => {
    if (btn) btn.addEventListener('click', (e) => {
      e.preventDefault();
      UI.openProfileModal();
    });
  });

  // 5. Wire Settings modal triggers
  const settingsTriggers = [
    document.getElementById('sidebarSettingsLink'),
    document.getElementById('headerSettingsBtn')
  ];
  settingsTriggers.forEach(btn => {
    if (btn) btn.addEventListener('click', (e) => {
      e.preventDefault();
      UI.openSettingsModal();
    });
  });

  // 6. Ambient Falling Orbs Background
  function setupOrbs() {
    let container = document.querySelector('.orbs-bg');
    if (!container) {
      container = document.createElement('div');
      container.className = 'orbs-bg';
      document.body.prepend(container);
    }
    if (container.dataset.initialized) return;
    container.dataset.initialized = 'true';

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const orbCount = isMobile ? 6 : 10;
    const palette = ['#0070f3', '#00b4d8', '#8b5cf6', '#a855f7', '#ff007f', '#10b981', '#f97316'];

    for (let i = 0; i < orbCount; i++) {
      const orb = document.createElement('div');
      orb.className = 'orb';
      const size = Math.floor(140 + Math.random() * 180);
      const x = Math.floor(Math.random() * 95);
      const dx = Math.floor((Math.random() * 60) - 30);
      const duration = (22 + Math.random() * 14).toFixed(1);
      const delay = (Math.random() * 18).toFixed(1);

      orb.style.setProperty('--size', `${size}px`);
      orb.style.setProperty('--x', `${x}%`);
      orb.style.setProperty('--dx', `${dx}px`);
      orb.style.setProperty('--duration', `${duration}s`);
      orb.style.setProperty('--delay', `-${delay}s`);
      orb.style.setProperty('--orb-color', palette[i % palette.length]);

      container.appendChild(orb);
    }
  }
  setupOrbs();

  // 7. Smooth Scroll & Staggered Reveal Observer for Grid Cards
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.05,
    rootMargin: '0px 0px -20px 0px'
  });

  function attachScrollReveals(parent = document) {
    const elements = parent.querySelectorAll('.reveal');
    elements.forEach((el, i) => {
      if (!el.style.getPropertyValue('--reveal-delay')) {
        el.style.setProperty('--reveal-delay', `${Math.min(i % 16, 10) * 35}ms`);
      }
      revealObserver.observe(el);
    });
  }

  // Trigger initial elements on page
  attachScrollReveals();

  // 8. Page Entrance and Smooth In-Between Navigation
  requestAnimationFrame(() => {
    document.body.classList.add('page-loaded');
  });

  function navigateSmoothly(url) {
    document.body.classList.add('page-fade-out');
    setTimeout(() => {
      window.location.href = url;
    }, 180);
  }

  document.querySelectorAll('a[data-nav="smooth"], .sidebar__nav-item[href$=".html"], .top-header__nav-link[href$=".html"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === '#' || href.startsWith('javascript:')) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      navigateSmoothly(href);
    });
  });

  // 9. Themes Switching (9 Fully-Working PlayStation Themes)
  const themeToggle = document.getElementById('themeToggle');
  const themeSelect = document.getElementById('themeSelect');

  const themes = [
    { value: 'dark', label: 'Dark Navy', icon: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z' },
    { value: 'light', label: 'PS5 Clean', icon: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6L4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M16 12a4 4 0 11-8 0 4 4 0 018 0z' },
    { value: 'ocean', label: 'Ocean Trench', icon: 'M2 7c2 2.5 4.5 3.5 7 3.5S14 9.5 17 7s4.5-3.5 5-3.5M2 13c2 2.5 4.5 3.5 7 3.5s5-1 8-3.5 4.5-3.5 5-3.5M2 19c2 2.5 4.5 3.5 7 3.5s5-1 8-3.5 4.5-3.5 5-3.5' },
    { value: 'cyberpunk', label: 'Cyberpunk', icon: 'M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z' },
    { value: 'forest', label: 'Emerald Forest', icon: 'M12 2L6 11h3v7h6v-7h3zM12 18v4' },
    { value: 'amber', label: 'Molten Amber', icon: 'M12 2c3.2 4.4 5.5 7.2 5.5 10a5.5 5.5 0 11-11 0c0-2.8 2.3-5.6 5.5-10z' },
    { value: 'violet', label: 'Cosmic Violet', icon: 'M12 3a9 9 0 109 9c0-2-4.5-3.5-9-3.5S3 10 3 12a9 9 0 009-9z' },
    { value: 'sunset', label: 'Synth Sunset', icon: 'M12 4a5 5 0 015 5v1H7V9a5 5 0 015-5zM3 18h18M6 14h12' },
    { value: 'classic', label: 'Classic PS', icon: 'M6 12h4M8 10v4M15 13h.01M18 11h.01M17.5 6H6.5A4.5 4.5 0 002 10.5v3A4.5 4.5 0 006.5 18h11a4.5 4.5 0 004.5-4.5v-3A4.5 4.5 0 0017.5 6z' }
  ];

  function themeIconSVG(themeObj) {
    const d = (themeObj && themeObj.icon) || themes[0].icon;
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  }

  function applyTheme(themeName) {
    const themeObj = themes.find(t => t.value === themeName) || themes[0];
    document.documentElement.setAttribute('data-theme', themeObj.value);
    localStorage.setItem('ps4_theme', themeObj.value);

    if (themeToggle) themeToggle.innerHTML = themeIconSVG(themeObj);
    if (themeSelect) themeSelect.value = themeObj.value;

    const orbs = document.querySelectorAll('.orb');
    orbs.forEach(orb => {
      orb.style.removeProperty('--orb-color');
    });
  }

  const initialTheme = localStorage.getItem('ps4_theme') || 'dark';
  applyTheme(initialTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const idx = themes.findIndex(t => t.value === current);
      const nextTheme = themes[(idx + 1) % themes.length];
      applyTheme(nextTheme.value);
      UI.showToast(`Theme: ${nextTheme.label}`);
    });
  }

  if (themeSelect) {
    themeSelect.innerHTML = '';
    themes.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.value;
      opt.textContent = t.label;
      themeSelect.appendChild(opt);
    });
    themeSelect.value = initialTheme;
    themeSelect.addEventListener('change', (e) => {
      applyTheme(e.target.value);
    });
  }

  // 10. Dedicated Game Detail Page (game-detail.html)
  const gameDetailContainer = document.getElementById('gameDetailContainer');
  if (gameDetailContainer) {
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('id');
    const game = gameId ? db.getGameById(gameId) : null;

    if (game) {
      document.title = `PS4 Database - ${game.title}`;
      gameDetailContainer.innerHTML = `
        <div style="margin-bottom: var(--space-lg);">
          <a href="search.html" class="btn btn--secondary" data-nav="smooth">
            ← Back to Store
          </a>
        </div>
        ${UI.buildDetailHTML(game)}
      `;

      // Wishlist toggle listener on dedicated page
      const wishlistBtn = gameDetailContainer.querySelector('.modal-wishlist-toggle');
      if (wishlistBtn) {
        wishlistBtn.addEventListener('click', () => {
          let wishlist = JSON.parse(localStorage.getItem('ps4_wishlist') || '[]');
          if (wishlist.includes(game.id)) {
            wishlist = wishlist.filter(id => id !== game.id);
            wishlistBtn.classList.remove('btn--wishlist--active');
            wishlistBtn.innerHTML = `
              <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
              </svg> Add to Wishlist
            `;
            UI.showToast(`Removed "${game.title}" from Wishlist`);
          } else {
            wishlist.push(game.id);
            wishlistBtn.classList.add('btn--wishlist--active');
            wishlistBtn.innerHTML = `
              <svg width="17" height="17" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
              </svg> In Wishlist
            `;
            UI.showToast(`Added "${game.title}" to Wishlist!`);
          }
          localStorage.setItem('ps4_wishlist', JSON.stringify(wishlist));
          UI.syncWishlistBadges();
        });
      }
    } else {
      gameDetailContainer.innerHTML = `
        <div class="empty-state">
          <h3>Game Not Found</h3>
          <p>The requested game ID could not be located in the database.</p>
          <a href="search.html" class="btn btn--primary" style="margin-top: var(--space-md);" data-nav="smooth">Browse Games</a>
        </div>
      `;
    }
  }

  // 11. Dedicated Wishlist Page (wishlist.html)
  const wishlistGrid = document.getElementById('wishlistGrid');
  if (wishlistGrid) {
    function renderWishlistPage() {
      const wishlist = JSON.parse(localStorage.getItem('ps4_wishlist') || '[]');
      const savedGames = db.games.filter(g => wishlist.includes(g.id));

      const countEl = document.getElementById('wishlistCountText');
      if (countEl) {
        countEl.textContent = `${savedGames.length} game${savedGames.length !== 1 ? 's' : ''} saved`;
      }

      if (savedGames.length === 0) {
        wishlistGrid.innerHTML = `
          <div class="empty-state">
            <svg class="empty-state__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg>
            <h3>Your Wishlist is Empty</h3>
            <p>Save games you want to download later by clicking the heart icon on any game card.</p>
            <a href="search.html" class="btn btn--primary" style="margin-top: var(--space-md);" data-nav="smooth">Browse Games</a>
          </div>
        `;
        return;
      }

      UI.renderGameGrid(savedGames, wishlistGrid);
      attachScrollReveals(wishlistGrid);
    }

    renderWishlistPage();

    const clearWishlistBtn = document.getElementById('clearWishlistBtn');
    if (clearWishlistBtn) {
      clearWishlistBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear your entire wishlist?')) {
          localStorage.setItem('ps4_wishlist', JSON.stringify([]));
          UI.syncWishlistBadges();
          renderWishlistPage();
          UI.showToast('Wishlist cleared.');
        }
      });
    }
  }

  // 12. Pagination & Filtering for Store & Home (index.html & search.html)
  const gridContainer = document.getElementById('gameGrid');
  const searchInput = document.getElementById('searchInput');
  const pageSizeSelect = document.getElementById('pageSize');
  const paginationEl = document.getElementById('pagination');
  const sortSelect = document.getElementById('sortSelect');

  if (gridContainer) {
    // Read saved page size or default to 24 (options: 12, 24, 48)
    const savedPageSize = parseInt(localStorage.getItem('ps4_pageSize') || pageSizeSelect?.value || '24', 10);
    const validSizes = [12, 24, 48];
    const initialPageSize = validSizes.includes(savedPageSize) ? savedPageSize : 24;

    if (pageSizeSelect) {
      pageSizeSelect.value = String(initialPageSize);
    }

    const state = {
      pageSize: initialPageSize,
      currentPage: 1,
      results: db.games
    };

    function renderMainGrid() {
      const total = state.results.length;
      const totalPages = Math.max(1, Math.ceil(total / state.pageSize));

      if (state.currentPage > totalPages) state.currentPage = totalPages;
      if (state.currentPage < 1) state.currentPage = 1;

      const start = (state.currentPage - 1) * state.pageSize;
      const end = start + state.pageSize;
      const pageItems = state.results.slice(start, end);

      UI.renderGameGrid(pageItems, gridContainer);
      updateResultCount(total, start, end);
      renderPaginationControls(totalPages);

      attachScrollReveals(gridContainer);
    }

    function updateResultCount(total, start, end) {
      const el = document.getElementById('resultCount');
      if (!el) return;
      if (total === 0) {
        el.textContent = 'No games found';
      } else {
        el.textContent = `Showing ${start + 1}–${Math.min(end, total)} of ${total} games`;
      }
    }

    function renderPaginationControls(totalPages) {
      if (!paginationEl) return;
      paginationEl.innerHTML = '';
      if (totalPages <= 1) return;

      const createBtn = (label, page, opts = {}) => {
        const btn = document.createElement('button');
        btn.className = 'pagination__btn' + (opts.active ? ' active' : '');
        btn.textContent = label;
        if (opts.disabled) btn.disabled = true;
        if (!opts.disabled && !opts.active) {
          btn.addEventListener('click', () => {
            state.currentPage = page;
            renderMainGrid();
            window.scrollTo({ top: gridContainer.offsetTop - 90, behavior: 'smooth' });
          });
        }
        return btn;
      };

      const createEllipsis = () => {
        const span = document.createElement('span');
        span.className = 'pagination__ellipsis';
        span.textContent = '…';
        return span;
      };

      paginationEl.appendChild(createBtn('‹ Prev', state.currentPage - 1, { disabled: state.currentPage === 1 }));

      const current = state.currentPage;
      const delta = 2;
      const range = [];
      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= current - delta && i <= current + delta)) {
          range.push(i);
        }
      }

      let last;
      for (const i of range) {
        if (last) {
          if (i - last === 2) paginationEl.appendChild(createBtn(String(last + 1), last + 1, { active: last + 1 === current }));
          else if (i - last > 2) paginationEl.appendChild(createEllipsis());
        }
        paginationEl.appendChild(createBtn(String(i), i, { active: i === current }));
        last = i;
      }

      paginationEl.appendChild(createBtn('Next ›', state.currentPage + 1, { disabled: state.currentPage === totalPages }));
    }

    function applyFilterAndReset() {
      state.results = db.applyFilters();
      state.currentPage = 1;
      renderMainGrid();
    }

    // Read URL query on search page
    if (searchInput) {
      const urlParams = new URLSearchParams(window.location.search);
      const initialQuery = urlParams.get('q');
      if (initialQuery) {
        searchInput.value = initialQuery;
        db.updateFilter('searchQuery', initialQuery);
        applyFilterAndReset();
      }

      let timeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          db.updateFilter('searchQuery', e.target.value.trim());
          applyFilterAndReset();
        }, 220);
      });

      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const q = e.target.value.trim();
          if (window.location.pathname.includes('search.html')) {
            db.updateFilter('searchQuery', q);
            applyFilterAndReset();
          } else {
            navigateSmoothly(`search.html?q=${encodeURIComponent(q)}`);
          }
        }
      });
    }

    const homeSearchBtn = document.getElementById('homeSearchBtn');
    if (homeSearchBtn && searchInput) {
      homeSearchBtn.addEventListener('click', () => {
        const q = searchInput.value.trim();
        navigateSmoothly(`search.html?q=${encodeURIComponent(q)}`);
      });
    }

    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', (e) => {
        const newSize = parseInt(e.target.value, 10);
        state.pageSize = newSize;
        state.currentPage = 1;
        localStorage.setItem('ps4_pageSize', String(newSize));
        renderMainGrid();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        db.updateFilter('sortBy', e.target.value);
        applyFilterAndReset();
      });
    }

    // Region checkboxes
    document.querySelectorAll('input[name="region"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const selected = Array.from(document.querySelectorAll('input[name="region"]:checked')).map(el => el.value);
        db.updateFilter('region', selected);
        applyFilterAndReset();
      });
    });

    const resetBtn = document.getElementById('resetFilters');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        if (searchInput) searchInput.value = '';
        db.filters.region = [];
        db.filters.genre = [];
        db.filters.searchQuery = '';
        applyFilterAndReset();
      });
    }

    // Initial render
    state.results = db.games;
    renderMainGrid();
  }

  // 13. Modal Close Listeners
  const gameModal = document.getElementById('gameModal');
  if (gameModal) {
    gameModal.querySelector('.modal__close')?.addEventListener('click', () => UI.closeModal());
    gameModal.addEventListener('click', (e) => {
      if (e.target === gameModal) UI.closeModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      UI.closeModal();
      document.getElementById('profileModal')?.classList.remove('modal--active');
      document.getElementById('settingsModal')?.classList.remove('modal--active');
    }
  });

  // 14. Global Card Click & Wishlist Delegations
  document.addEventListener('click', (e) => {
    const downloadBtn = e.target.closest('.btn--download');
    const wishlistBtn = e.target.closest('.btn--wishlist');
    const gameCard = e.target.closest('.game-card');

    if (downloadBtn) {
      e.stopPropagation();
      const game = db.getGameById(downloadBtn.dataset.gameId);
      if (game) UI.showGameDetail(game);
      return;
    }

    if (wishlistBtn) {
      e.stopPropagation();
      const gameId = wishlistBtn.dataset.gameId;
      const game = db.getGameById(gameId);
      let wishlist = JSON.parse(localStorage.getItem('ps4_wishlist') || '[]');

      if (wishlist.includes(gameId)) {
        wishlist = wishlist.filter(id => id !== gameId);
        wishlistBtn.classList.remove('btn--wishlist--active');
        const heartSvg = wishlistBtn.querySelector('svg');
        if (heartSvg) heartSvg.setAttribute('fill', 'none');
        UI.showToast(`Removed from Wishlist`);

        if (window.location.pathname.includes('wishlist.html') && gameCard) {
          gameCard.classList.add('card-removing');
          setTimeout(() => {
            gameCard.remove();
            const remaining = document.querySelectorAll('#wishlistGrid .game-card:not(.card-removing)');
            if (remaining.length === 0) {
              const countEl = document.getElementById('wishlistCountText');
              if (countEl) countEl.textContent = '0 games saved';
              const grid = document.getElementById('wishlistGrid');
              if (grid) {
                grid.innerHTML = `
                  <div class="empty-state">
                    <svg class="empty-state__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                    </svg>
                    <h3>Your Wishlist is Empty</h3>
                    <p>Save games you want to download later by clicking the heart icon on any game card.</p>
                    <a href="search.html" class="btn btn--primary" style="margin-top: var(--space-md);" data-nav="smooth">Browse Games</a>
                  </div>
                `;
              }
            } else {
              const countEl = document.getElementById('wishlistCountText');
              if (countEl) countEl.textContent = `${remaining.length} game${remaining.length !== 1 ? 's' : ''} saved`;
            }
          }, 320);
        }
      } else {
        wishlist.push(gameId);
        wishlistBtn.classList.add('btn--wishlist--active');
        const heartSvg = wishlistBtn.querySelector('svg');
        if (heartSvg) heartSvg.setAttribute('fill', 'currentColor');
        UI.showToast(`Saved "${game ? game.title : 'Game'}" to Wishlist!`);
      }

      localStorage.setItem('ps4_wishlist', JSON.stringify(wishlist));
      UI.syncWishlistBadges();
      return;
    }

    if (gameCard) {
      const game = db.getGameById(gameCard.dataset.gameId);
      if (game) UI.showGameDetail(game);
    }
  });
});
