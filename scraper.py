import json
import urllib.request
import xml.etree.ElementTree as ET

# List your target CUSA / PPSA IDs here
GAMES_TO_TRACK = [
    {"title_id": "CUSA03173", "name": "Bloodborne: Game of the Year Edition", "region": "EU"},
    {"title_id": "CUSA00500", "name": "Bloodborne", "region": "US"}
]

def get_pkg_size(cusa_id):
    url = f"https://gs-sec.ww.np.dl.playstation.net/plo/np/{cusa_id}/{cusa_id}-ver.xml"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            xml_data = response.read()
            root = ET.fromstring(xml_data)
            for pkg in root.findall('.//package'):
                size_bytes = int(pkg.attrib.get('size', 0))
                return f"{round(size_bytes / (1024 ** 3), 2)} GB"
    except Exception as e:
        print(f"Could not fetch {cusa_id}: {e}")
    return "N/A"

# Update each game entry with the fetched package size
updated_games = []
for game in GAMES_TO_TRACK:
    game["size"] = get_pkg_size(game["title_id"])
    updated_games.append(game)

# Write output directly to games.json
with open("games.json", "w") as f:
    json.dump(updated_games, f, indent=2)

print("games.json successfully updated!")
