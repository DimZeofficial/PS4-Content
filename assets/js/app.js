document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 APP STARTING');

  // 1. Load database
  const db = new GameDatabase();
  await db.load();
  console.log('🚀 Loaded', db.games.length, 'games');

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

  if (!gridContainer) {
    console.error('🔴 No #gameGrid found — aborting');
    return;
  }

  // 4. Render pipeline
  function render() {
    const total = state.results.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));

    // Clamp current page
    if (state.currentPage > totalPages) state.currentPage = totalPages;
    if (state.currentPage < 1) state.currentPage = 1;

    const start = (state.currentPage - 1) * state.pageSize;
    const end = start + state.pageSize;
    const pageItems = state.results.slice(start, end);

    UI.renderGameGrid(pageItems, gridContainer);
    updateResultCount(total, start, end);
    renderPagination(totalPages);
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

    // Previous
    paginationEl.appendChild(createBtn('‹', state.currentPage - 1, {
      disabled: state.currentPage === 1
    }));

    // Page numbers with ellipsis
    const pages = getPageNumbers(state.currentPage, totalPages);
    pages.forEach(p => {
      if (p === '...') {
        paginationEl.appendChild(createEllipsis());
      } else {
        paginationEl.appendChild(createBtn(String(p), p, {
          active: p === state.currentPage
        }));
      }
    });

    // Next
    paginationEl.appendChild(createBtn('›', state.currentPage + 1, {
      disabled: state.currentPage === totalPages
    }));
  }

  function getPageNumbers(current, total) {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let last;

    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (last) {
        if (i - last === 2) {
          rangeWithDots.push(last + 1);
        } else if (i - last > 2) {
          rangeWithDots.push('...');
        }
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

  // 5. Initial render
  state.results = db.games;
  render();

  // 6. Search wiring
  if (searchInput) {
    console.log('🚀 Wiring up live search...');

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
          window.location.href = `search?q=${encodeURIComponent(q)}`;
        }
      }
    });
  }

  // 7. Page size selector
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener('change', (e) => {
      state.pageSize = parseInt(e.target.value, 10);
      state.currentPage = 1;
      render();
    });
  }

  // 8. Sort dropdown
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      db.updateFilter('sortBy', e.target.value);
      applyFilterAndReset();
    });
  }

  // 9. Region checkboxes
  document.querySelectorAll('input[name="region"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const selected = Array.from(document.querySelectorAll('input[name="region"]:checked')).map(el => el.value);
      db.updateFilter('region', selected);
      applyFilterAndReset();
    });
  });

  // 10. Firmware checkboxes
  document.querySelectorAll('input[name="firmware"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const selected = Array.from(document.querySelectorAll('input[name="firmware"]:checked')).map(el => el.value);
      db.updateFilter('firmware', selected);
      applyFilterAndReset();
    });
  });

  // 11. Reset filters
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

  // 13. Card clicks
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
        wishlistBtn.style.color = 'var(--color-text-secondary)';
      } else {
        wishlist.push(gameId);
        wishlistBtn.style.color = 'var(--color-accent-danger)';
      }
      localStorage.setItem('ps4_wishlist', JSON.stringify(wishlist));
    }

    if (gameCard && !downloadBtn && !wishlistBtn) {
      const game = db.getGameById(gameCard.dataset.gameId);
      if (game) UI.showGameDetail(game);
    }
  });

  // 14. Theme toggle
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    const currentTheme = localStorage.getItem('ps4_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggle.addEventListener('click', () => {
      const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('ps4_theme', newTheme);
      themeToggle.textContent = newTheme === 'dark' ? '🌙' : '☀️';
    });
    themeToggle.textContent = currentTheme === 'dark' ? '🌙' : '☀️';
  }

  console.log('🚀 APP READY');
});