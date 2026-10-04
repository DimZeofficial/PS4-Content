document.addEventListener('DOMContentLoaded', async () => {
  // 1. Load database
  const db = new GameDatabase();
  await db.load();

  // 2. State
  const state = {
    pageSize: 20,
    currentPage: 1,
    results: db.games
  };

  // 3. Find elements
  const gridContainer = document.getElementById('gameGrid');
  const searchInput = document.getElementById('searchInput');
  const pageSizeSelect = document.getElementById('pageSize');
  const paginationEl = document.getElementById('pagination');

  // 4. Reveal on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -40px 0px'
  });

  function observeGrid(items) {
    items.forEach((el, idx) => {
      el.style.setProperty('--reveal-delay', `${Math.min(idx % 20, 12) * 40}ms`);
      observer.observe(el);
    });
  }

  // 5. Render pipeline
  function render() {
    const total = state.results.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));

    if (state.currentPage > totalPages) state.currentPage = totalPages;
    if (state.currentPage < 1) state.currentPage = 1;

    const start = (state.currentPage - 1) * state.pageSize;
    const end = start + state.pageSize;
    const pageItems = state.results.slice(start, end);

    UI.renderGameGrid(pageItems, gridContainer);
    updateResultCount(total, start, end);
    renderPagination(totalPages);

    setTimeout(() => {
      if (gridContainer) {
        const cards = gridContainer.querySelectorAll('.game-card, .reveal');
        cards.forEach((card) => card.classList.add('reveal'));
        observeGrid(cards);
      }
    }, 50);

    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  function renderPagination(totalPages) {
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
          render();
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

    paginationEl.appendChild(createBtn('‹', state.currentPage - 1, { disabled: state.currentPage === 1 }));
    const pages = getPageNumbers(state.currentPage, totalPages);
    pages.forEach(p => {
      if (p === '...') paginationEl.appendChild(createEllipsis());
      else paginationEl.appendChild(createBtn(String(p), p, { active: p === state.currentPage }));
    });
    paginationEl.appendChild(createBtn('›', state.currentPage + 1, { disabled: state.currentPage === totalPages }));
  }

  function getPageNumbers(current, total) {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let last;
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) range.push(i);
    }
    for (const i of range) {
      if (last) {
        if (i - last === 2) rangeWithDots.push(last + 1);
        else if (i - last > 2) rangeWithDots.push('...');
      }
      rangeWithDots.push(i);
      last = i;
    }
    return rangeWithDots;
  }

  function applyFilterAndReset() {
    state.results = db.applyFilters();
    state.currentPage = 1;
    render();
  }

  // 6. Initial
  state.results = db.games;
  render();

  // 7. Search
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
      }, 250);
    });
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const q = e.target.value.trim();
        if (window.location.pathname.includes('search')) {
          db.updateFilter('searchQuery', q);
          applyFilterAndReset();
        } else {
          navigateWithTransition(`search?q=${encodeURIComponent(q)}`);
        }
      }
    });
  }

  // 8. Page size
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener('change', (e) => {
      state.pageSize = parseInt(e.target.value, 10);
      state.currentPage = 1;
      render();
    });
  }

  // 9. Sort
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      db.updateFilter('sortBy', e.target.value);
      applyFilterAndReset();
    });
  }

  // 10. Filters
  document.querySelectorAll('input[name="region"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const selected = Array.from(document.querySelectorAll('input[name="region"]:checked')).map(el => el.value);
      db.updateFilter('region', selected);
      applyFilterAndReset();
    });
  });
  document.querySelectorAll('input[name="firmware"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const selected = Array.from(document.querySelectorAll('input[name="firmware"]:checked')).map(el => el.value);
      db.updateFilter('firmware', selected);
      applyFilterAndReset();
    });
  });

  // 11. Reset
  const resetBtn = document.getElementById('resetFilters');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
      if (searchInput) searchInput.value = '';
      db.filters.region = [];
      db.filters.firmware = [];
      db.filters.searchQuery = '';
      applyFilterAndReset();
    });
  }

  // 12. Modal
  const modal = document.getElementById('gameModal');
  if (modal) {
    modal.querySelector('.modal__close')?.addEventListener('click', () => UI.closeModal());
    modal.addEventListener('click', (e) => { if (e.target === modal) UI.closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') UI.closeModal(); });
  }

  // 13. Card clicks + wishlist + smooth nav
  function navigateWithTransition(url) {
    document.body.classList.add('page-fade-out');
    setTimeout(() => {
      window.location.href = url;
    }, 160);
  }

  document.querySelectorAll('a[data-nav="smooth"], .sidebar__nav-item[href$=".html"], .top-header__nav-link[href$=".html"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      if (e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      navigateWithTransition(href);
    });
  });

  document.addEventListener('click', (e) => {
    const downloadBtn = e.target.closest('.btn--download');
    const wishlistBtn = e.target.closest('.btn--wishlist');
    const gameCard = e.target.closest('.game-card');

    if (downloadBtn) {
      const game = db.getGameById(downloadBtn.dataset.gameId);
      if (game) UI.showGameDetail(game);
    }

    if (wishlistBtn) {
      const gameId = wishlistBtn.dataset.gameId;
      let wishlist = JSON.parse(localStorage.getItem('ps4_wishlist') || '[]');
      if (wishlist.includes(gameId)) {
        wishlist = wishlist.filter(id => id !== gameId);
        wishlistBtn.classList.remove('btn--wishlist--active');
      } else {
        wishlist.push(gameId);
        wishlistBtn.classList.add('btn--wishlist--active');
      }
      localStorage.setItem('ps4_wishlist', JSON.stringify(wishlist));
    }

    if (gameCard && !downloadBtn && !wishlistBtn) {
      const game = db.getGameById(gameCard.dataset.gameId);
      if (game) UI.showGameDetail(game);
    }
  });

  // 14. Theme toggle + dropdown
  const themeToggle = document.getElementById('themeToggle');
  const themeSelect = document.getElementById('themeSelect');
  const themes = [
    { value: 'dark', label: 'Dark', emoji: '🌙' },
    { value: 'light', label: 'Light', emoji: '☀️' },
    { value: 'ocean', label: 'Ocean', emoji: '🌊' },
    { value: 'cyberpunk', label: 'Cyberpunk', emoji: '🪩' },
    { value: 'forest', label: 'Forest', emoji: '🌲' },
    { value: 'amber', label: 'Amber', emoji: '🔥' },
    { value: 'violet', label: 'Violet', emoji: '🌀' }
  ];

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ps4_theme', theme);
    const found = themes.find(t => t.value === theme);
    if (themeToggle) themeToggle.textContent = found ? found.emoji : '🎨';
    if (themeSelect) themeSelect.value = theme;
  }

  applyTheme(localStorage.getItem('ps4_theme') || 'dark');

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const idx = themes.findIndex(t => t.value === current);
      const next = themes[(idx + 1) % themes.length];
      applyTheme(next.value);
    });
  }

  if (themeSelect) {
    themes.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.value;
      opt.textContent = `${t.emoji} ${t.label}`;
      themeSelect.appendChild(opt);
    });
    themeSelect.value = document.documentElement.getAttribute('data-theme') || 'dark';
    themeSelect.addEventListener('change', (e) => applyTheme(e.target.value));
  }

  // 15. Wishlist page sync
  function syncWishlistUI() {
    const wishlist = JSON.parse(localStorage.getItem('ps4_wishlist') || '[]');
    document.querySelectorAll('.btn--wishlist').forEach(btn => {
      if (wishlist.includes(btn.dataset.gameId)) btn.classList.add('btn--wishlist--active');
    });
  }
  syncWishlistUI();

  // 16. Orbs
  function createOrbs() {
    const container = document.querySelector('.orbs-bg') || (() => {
      const c = document.createElement('div');
      c.className = 'orbs-bg';
      document.body.prepend(c);
      return c;
    })();
    if (container.dataset.filled) return;
    container.dataset.filled = 'true';
    const count = window.matchMedia('(max-width: 768px)').matches ? 6 : 10;
    for (let i = 0; i < count; i++) {
      const orb = document.createElement('div');
      orb.className = 'orb';
      const size = 120 + Math.random() * 220;
      const x = Math.random() * 100;
      const dx = (Math.random() * 40 - 20);
      const dur = 24 + Math.random() * 16;
      const delay = Math.random() * 20;
      orb.style.setProperty('--size', size + 'px');
      orb.style.setProperty('--x', x + '%');
      orb.style.setProperty('--dx', dx + 'px');
      orb.style.setProperty('--duration', dur + 's');
      orb.style.setProperty('--delay', delay + 's');
      orb.style.setProperty('--orb-color', ['#0070f3', '#8b5cf6', '#38bdf8', '#ff3cac', '#34d399', '#f59e0b'][i % 6]);
      container.appendChild(orb);
    }
  }
  createOrbs();
  window.addEventListener('resize', createOrbs, { passive: true });

  // 17. Page load reveal
  requestAnimationFrame(() => {
    document.body.classList.add('page-loaded');
  });

  // 18. Wishlist dedicated page
  const wishlistGrid = document.getElementById('wishlistGrid');
  if (wishlistGrid && window.location.pathname.includes('wishlist')) {
    const wishlist = JSON.parse(localStorage.getItem('ps4_wishlist') || '[]');
    const items = db.games.filter(g => wishlist.includes(g.id));
    if (items.length === 0) {
      wishlistGrid.innerHTML = '<div class="empty-state"><h3>No games in wishlist yet</h3><p>Add games by clicking the heart icon.</p></div>';
    } else {
      UI.renderGameGrid(items, wishlistGrid);
      setTimeout(() => {
        const cards = wishlistGrid.querySelectorAll('.game-card');
        cards.forEach(c => { c.classList.add('reveal'); observer.observe(c); });
      }, 30);
    }
  }
});
