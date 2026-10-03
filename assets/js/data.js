/**
 * Data Management Layer
 * Handles fetching, filtering, and sorting of game data.
 */
class GameDatabase {
  constructor() {
    this.games = [];
    this.filteredGames = [];
    this.filters = {
      region: [],
      firmware: [],
      genre: [],
      searchQuery: '',
      sortBy: 'title',
      sortOrder: 'asc'
    };
  }

  /**
   * Load games from the JSON file.
   */
  async load() {
    try {
      const response = await fetch('/data/games.json');
      if (!response.ok) throw new Error('Failed to load games data');
      const data = await response.json();
      this.games = data.games || [];
      this.filteredGames = [...this.games];
      return this;
    } catch (error) {
      console.error('Error loading game database:', error);
      this.games = [];
      this.filteredGames = [];
      return this;
    }
  }

  /**
   * Apply current filters and sorting to the game list.
   */
  applyFilters() {
    const query = (this.filters.searchQuery || '').toLowerCase().trim();

    this.filteredGames = this.games.filter(game => {
      // Region filter
      if (this.filters.region.length > 0 && 
          !this.filters.region.includes(game.region)) return false;
      
      // Firmware filter
      if (this.filters.firmware.length > 0 && 
          !this.filters.firmware.includes(game.firmware)) return false;
      
      // Genre filter
      if (this.filters.genre.length > 0 && 
          !(game.genre || []).some(g => this.filters.genre.includes(g))) return false;
      
      // Search query — safely checks title, id, developer, and slug
      if (query) {
        const title = (game.title || '').toLowerCase();
        const id = (game.id || '').toLowerCase();
        const developer = (game.developer || '').toLowerCase();
        const slug = (game.slug || '').toLowerCase();

        return title.includes(query) ||
               id.includes(query) ||
               developer.includes(query) ||
               slug.includes(query);
      }
      
      return true;
    });
    
    this.sortGames();
    return this.filteredGames;
  }

  /**
   * Sort the filtered games based on current sort settings.
   */
  sortGames() {
    const { sortBy, sortOrder } = this.filters;
    this.filteredGames.sort((a, b) => {
      let valueA = a[sortBy];
      let valueB = b[sortBy];
      
      // Handle nested properties (e.g., 'size.game')
      if (sortBy.includes('.')) {
        const [parent, child] = sortBy.split('.');
        valueA = a[parent]?.[child] ?? '';
        valueB = b[parent]?.[child] ?? '';
      }
      
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }
      
      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  /**
   * Update a specific filter and re-apply.
   */
  updateFilter(key, value) {
    this.filters[key] = value;
    return this.applyFilters();
  }

  /**
   * Get a single game by its ID.
   */
  getGameById(id) {
    return this.games.find(game => game.id === id) || null;
  }
}