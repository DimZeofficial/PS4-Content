const fs = require('fs');
const path = require('path');

// ==========================================
// 1. CONFIGURATION - ADD YOUR CREDENTIALS HERE
// ==========================================
const IGDB_CLIENT_ID = 'f4xukpt58sm9wyfjzz1uhwjtqszi18';         // Paste your Client ID
const IGDB_ACCESS_TOKEN = '08n03i2r8bshiih7zfi6n3j6o8e5yn';   // Paste your Access Token
const JSON_FILE = 'data/games.json';
// ==========================================

// A delay function to prevent hitting IGDB rate limits (4 requests per second max)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchIGDBCover(gameTitle) {
  const url = 'https://api.igdb.com/v4/games';
  
  // IGDB uses a specific query language called Apicalypse
  const query = `search "${gameTitle}"; fields name, cover.url, summary, first_release_date, genres.name, involved_companies.company.name; limit 1;`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Client-ID': IGDB_CLIENT_ID,
        'Authorization': `Bearer ${IGDB_ACCESS_TOKEN}`,
        'Content-Type': 'text/plain'
      },
      body: query
    });

    if (!response.ok) {
      // If token expired, this will fail
      if (response.status === 401) {
        console.error(`❌ Error: IGDB Token is expired or invalid. Please get a new one.`);
        process.exit(1);
      }
      return null;
    }

    const data = await response.json();
    
    // If no game found on IGDB, return null
    if (!data || data.length === 0) return null;

    const game = data[0];
    const coverUrl = game.cover ? `https:${game.cover.url.replace('t_thumb', 't_cover_big')}` : null;
    
    // Format release date
    let releaseDate = "2024-01-01";
    if (game.first_release_date) {
      releaseDate = new Date(game.first_release_date * 1000).toISOString().split('T')[0];
    }

    // Get developer and genres
    const developer = game.involved_companies?.[0]?.company?.name || "Unknown";
    const genres = game.genres ? game.genres.map(g => g.name) : ["Action", "Adventure"];

    return {
      coverImage: coverUrl,
      description: game.summary || `Download ${gameTitle} for PS5.`,
      releaseDate: releaseDate,
      developer: developer,
      genre: genres
    };

  } catch (error) {
    console.error(`Network error fetching ${gameTitle}:`, error.message);
    return null;
  }
}

async function main() {
  if (IGDB_CLIENT_ID === 'YOUR_CLIENT_ID_HERE' || IGDB_ACCESS_TOKEN === 'YOUR_ACCESS_TOKEN_HERE') {
    console.log("⚠️ Please edit this file and add your IGDB_CLIENT_ID and IGDB_ACCESS_TOKEN at the top.");
    return;
  }

  console.log("Loading games.json...");
  const rawData = fs.readFileSync(JSON_FILE, 'utf-8');
  const data = JSON.parse(rawData);
  
  const totalGames = data.games.length;
  console.log(`Found ${totalGames} games. Starting IGDB lookup...`);
  console.log(`This will take roughly ${Math.ceil(totalGames / 4)} minutes to avoid rate limits.\n`);

  let updatedCount = 0;

  for (let i = 0; i < totalGames; i++) {
    const game = data.games[i];
    
    // Skip if it already has a real IGDB image (optional)
    if (game.coverImage && game.coverImage.includes('images.igdb.com')) {
      continue; 
    }

    process.stdout.write(`[${i + 1}/${totalGames}] Searching: ${game.title}... `);
    
    const igdbData = await fetchIGDBCover(game.title);

    if (igdbData && igdbData.coverImage) {
      game.coverImage = igdbData.coverImage;
      game.description = igdbData.description;
      game.releaseDate = igdbData.releaseDate;
      game.developer = igdbData.developer;
      game.genre = igdbData.genre;
      updatedCount++;
      console.log(`✅ Found`);
    } else {
      console.log(`❌ Not Found (Keeping placeholder)`);
    }

    // Wait 300ms between requests to respect rate limits (approx 3 requests/sec)
    await sleep(300);
  }

  // Save the updated data back to games.json
  console.log(`\nSaving ${updatedCount} updated games to ${JSON_FILE}...`);
  fs.writeFileSync(JSON_FILE, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`🎉 Successfully updated covers and metadata!`);
}

main();