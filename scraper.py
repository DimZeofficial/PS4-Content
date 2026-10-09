import json
import re
import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, AppleWebKit, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
}

def scrape_pkg_links(page_url):
    """Scrapes PKG download links from a pkgps4.click page."""
    try:
        response = requests.get(page_url, headers=HEADERS, timeout=10)
        if response.status_code != 200:
            print(f"[!] Failed to fetch {page_url} (HTTP {response.status_code})")
            return []

        soup = BeautifulSoup(response.text, "html.parser")
        found_downloads = []

        # Find download links (adjust selector if page structure varies)
        for anchor in soup.find_all("a", href=True):
            href = anchor["href"]
            text = anchor.get_text(strip=True)
            
            # Match links pointing to .pkg files or hosters like 1fichier/MediaFire/Mega
            if re.search(r'\.(pkg)$|1fichier|mediafire|mega\.nz|pixeldrain', href, re.IGNORECASE):
                dl_type = "Game"
                if "update" in text.lower() or "patch" in text.lower():
                    dl_type = "Update"
                elif "dlc" in text.lower():
                    dl_type = "DLC"

                found_downloads.append({
                    "type": dl_type,
                    "source": "PKGPS4",
                    "url": href
                })

        return found_downloads

    except Exception as e:
        print(f"[!] Error scraping {page_url}: {e}")
        return []

def process_games(file_path="games.json", output_path="games_scraped.json"):
    """Reads games.json, filters PS4 games, scrapes download links, and saves output."""
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    scraped_games = []

    for game in data.get("games", []):
        title = game.get("title", "")
        game_id = game.get("id", "")
        desc = game.get("description", "")

        # Check if the title or description mentions PS5-exclusive content
        if "PS5" in desc or "Download" in desc and "for PS5" in desc:
            # Skip if it is purely a PS5 release (e.g. Broken links or PS5-only text)
            if "PS4" not in desc and not game_id.startswith("CUSA"):
                print(f"[-] Skipping non-PS4/PS5-only game: {title}")
                continue

        # Extract target page URL
        page_url = game.get("links", {}).get("pkgps4")
        if not page_url and game.get("downloads"):
            page_url = game["downloads"][0].get("url")

        if page_url:
            print(f"[+] Scraping [{game_id}] {title} ...")
            scraped_dl = scrape_pkg_links(page_url)
            if scraped_dl:
                game["downloads"] = scraped_dl

        scraped_games.append(game)

    # Save processed data
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({"games": scraped_games}, f, indent=2, ensure_ascii=False)

    print(f"\n[✓] Finished processing {len(scraped_games)} PS4 games. Saved to '{output_path}'.")

if __name__ == "__main__":
    process_games()
