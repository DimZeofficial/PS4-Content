/**
 * UI Rendering Layer
 * Handles all DOM manipulation and rendering.
 */
const UI = {
  /**
   * Render the game grid.
   * @param {Array} games - Array of game objects
   * @param {HTMLElement} container - Target container
   */
  renderGameGrid(games, container) {
    if (!container) return;

    if (games.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <h3>No games found</h3>
          <p>Try adjusting your filters or search query.</p>
        </div>
      `;
      this.updateResultCount(0);
      return;
    }
    
    const fragment = document.createDocumentFragment();
    games.forEach(game => {
      const card = this.createGameCard(game);
      fragment.appendChild(card);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
    this.updateResultCount(games.length);
  },

  /**
   * Create a single game card element.
   * @param {Object} game - Game data
   * @returns {HTMLElement}
   */
  createGameCard(game) {
    const article = document.createElement('article');
    article.className = 'game-card';
    article.dataset.gameId = game.id;
    article.innerHTML = `
      <div class="game-card__cover">
        <img src="${game.coverImage}" alt="${game.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x400/1a2332/ffffff?text=No+Cover'">
        <span class="game-card__badge game-card__badge--region">${game.region}</span>
        ${game.firmware ? `<span class="game-card__badge game-card__badge--firmware">${game.firmware}+</span>` : ''}
      </div>
      <div class="game-card__info">
        <h3 class="game-card__title" title="${game.title}">${game.title}</h3>
        <p class="game-card__meta">${game.id} • ${new Date(game.releaseDate).getFullYear()}</p>
        <div class="game-card__tags">
          ${game.genre.slice(0, 2).map(g => `<span class="tag">${g}</span>`).join('')}
          <span class="tag tag--size">${game.size.game}</span>
        </div>
      </div>
      <div class="game-card__actions">
        <button class="btn btn--primary btn--download" data-game-id="${game.id}">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
          </svg>
          Download
        </button>
        <button class="btn btn--icon btn--wishlist" data-game-id="${game.id}" title="Add to Wishlist">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
          </svg>
        </button>
      </div>
    `;
    return article;
  },

  /**
   * Show the game detail modal.
   * @param {Object} game - Game data
   */
  showGameDetail(game) {
    const modal = document.getElementById('gameModal');
    if (!modal) return;

    modal.querySelector('.modal__title').textContent = game.title;
    modal.querySelector('.modal__body').innerHTML = this.buildDetailHTML(game);
    modal.classList.add('modal--active');
  },

  /**
   * Build the HTML for the game detail modal.
   * @param {Object} game - Game data
   * @returns {string}
   */
  buildDetailHTML(game) {
    return `
      <div class="detail__header">
        <img src="${game.coverImage}" alt="${game.title}" class="detail__cover" onerror="this.src='https://via.placeholder.com/300x400/1a2332/ffffff?text=No+Cover'">
        <div class="detail__meta">
          <h2>${game.title}</h2>
          <p class="detail__id">${game.id}</p>
          <div class="detail__badges">
            <span class="badge">${game.region}</span>
            <span class="badge">${game.firmware}+</span>
            <span class="badge">${game.genre.join(', ')}</span>
          </div>
          <p class="detail__description">${game.description}</p>
        </div>
      </div>
      
      <div class="detail__downloads">
        <h3>Download Links</h3>
        
        ${game.links && game.links.pkgps4 ? `
          <div class="download-item" style="border-left: 3px solid var(--color-accent-primary); background-color: rgba(0, 112, 243, 0.05);">
            <div class="download-item__info">
              <span class="download-item__type" style="color: var(--color-accent-primary);">PKGPS4</span>
              <span class="download-item__notes">Direct download from pkgps4.click</span>
            </div>
            <div class="download-item__actions">
              <a href="${game.links.pkgps4}" class="btn btn--primary" target="_blank" rel="noopener">
                Download from PKGPS4
              </a>
            </div>
          </div>
        ` : ''}

        ${game.downloads.map(dl => `
          <div class="download-item">
            <div class="download-item__info">
              <span class="download-item__type">${dl.type}</span>
              ${dl.version ? `<span class="download-item__version">v${dl.version}</span>` : ''}
              ${dl.size ? `<span class="download-item__size">${dl.size}</span>` : ''}
              ${dl.notes ? `<span class="download-item__notes">${dl.notes}</span>` : ''}
            </div>
            <div class="download-item__actions">
              <a href="${dl.url}" class="btn btn--primary" target="_blank" rel="noopener">
                Download from ${dl.source || 'Host'}
              </a>
              ${dl.mirrors ? dl.mirrors.map(m => `
                <a href="${m.url}" class="btn btn--ghost" target="_blank" rel="noopener">
                  ${m.source}
                </a>
              `).join('') : ''}
            </div>
          </div>
        `).join('')}
      </div>
      
      <div class="detail__info">
        <h3>Information</h3>
        <dl class="info-grid">
          <dt>Developer</dt><dd>${game.developer}</dd>
          <dt>Publisher</dt><dd>${game.publisher}</dd>
          <dt>Release Date</dt><dd>${game.releaseDate}</dd>
          <dt>Password</dt><dd><code>${game.password || 'N/A'}</code></dd>
          <dt>Languages</dt><dd>${game.languages.join(', ')}</dd>
        </dl>
      </div>
    `;
  },

  /**
   * Update the result count element.
   * @param {number} count 
   */
  updateResultCount(count) {
    const el = document.getElementById('resultCount');
    if (el) {
      el.textContent = `${count} game${count !== 1 ? 's' : ''} found`;
    }
  },

  /**
   * Close the game detail modal.
   */
  closeModal() {
    const modal = document.getElementById('gameModal');
    if (modal) {
      modal.classList.remove('modal--active');
    }
  }
};