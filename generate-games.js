const fs = require('fs');
const path = require('path');

// 1. CONFIGURATION
const inputFile = 'games.txt'; // Your provided text file
const outputFile = 'data/games.json';          // Where the generated JSON will go

// 2. SLUG GENERATOR FUNCTION
// Converts "EA SPORTS FC 27" -> "ea-sports-fc-27"
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters (like ., :, !)
    .trim()
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-');         // Replace multiple hyphens with a single one
}

// 3. MAIN GENERATOR
function generateGamesJson() {
  try {
    // Read the text file
    const fileContent = fs.readFileSync(inputFile, 'utf-8');
    
    // Split by newline, remove empty lines and trim whitespace
    const lines = fileContent.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    console.log(`Found ${lines.length} games. Generating JSON...`);

    // Map each line to a game object
    const games = lines.map((title, index) => {
      const slug = generateSlug(title);
      const id = `PPSA${String(index + 1).padStart(5, '0')}`; // Auto-generate ID
      const pkgps4Url = `https://www.pkgps4.click/${slug}/`;
      
      return {
        id: id,
        title: title,
        slug: slug,
        description: `Download ${title} for PS5. Experience high-speed PKG downloads directly to your console.`,
        developer: "Unknown",
        publisher: "Unknown",
        releaseDate: "2024-01-01",
        genre: ["Action", "Adventure"], // Default genres
        region: "USA",
        firmware: "9.00",
        // Placeholder image using the game title
        coverImage: `https://via.placeholder.com/300x400/1a2332/ffffff?text=${encodeURIComponent(title)}`,
        size: { game: "15 GB", update: "0 MB", dlc: "0 MB" },
        downloads: [
          {
            type: "Game",
            source: "PKGPS4",
            url: pkgps4Url
          }
        ],
        password: "PKGPS4.COM",
        languages: ["English"],
        links: {
          pkgps4: pkgps4Url
        }
      };
    });

    // Prepare final output object
    const outputData = { games: games };
    
    // Ensure the data directory exists
    const dir = path.dirname(outputFile);
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }

    // Write the JSON file
    fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2), 'utf-8');
    console.log(`✅ Successfully generated ${games.length} games to ${outputFile}`);
    
  } catch (error) {
    console.error('❌ Error generating games JSON:', error);
  }
}

// Run the generator
generateGamesJson();