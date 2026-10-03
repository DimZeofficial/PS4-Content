const fs = require('fs');

const JSON_FILE = 'data/games.json';

function cleanGames() {
  const rawData = fs.readFileSync(JSON_FILE, 'utf-8');
  const data = JSON.parse(rawData);

  const originalCount = data.games.length;

  // Filter out unwanted games
  const filteredGames = data.games.filter(game => {
    // ❌ Remove any game with "PS5" in the title (case-insensitive)
    if (game.title.toUpperCase().includes('PS5')) {
      return false;
    }

    // ❌ Remove any game that still has the placeholder cover (IGDB couldn't find it)
    // Comment this out if you want to KEEP games without real covers
    if (game.coverImage.includes('via.placeholder.com')) {
      return false;
    }

    return true;
  });

  data.games = filteredGames;

  fs.writeFileSync(JSON_FILE, JSON.stringify(data, null, 2), 'utf-8');
  
  console.log(`📊 Original games: ${originalCount}`);
  console.log(`🗑️  Removed: ${originalCount - filteredGames.length}`);
  console.log(`✅ Remaining: ${filteredGames.length}`);
}

cleanGames();