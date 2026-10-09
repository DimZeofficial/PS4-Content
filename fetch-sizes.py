#!/usr/bin/env python3
"""
Fetch real PS4 game sizes and write them back into data/games.json.

Source chain per game (first hit wins):
  1. The pkgps4.click game page, which often embeds sizes inline, e.g.
         "Balatro v1 (PKG - 271.38 MB): <a>1fichier</a> - <a>mediafire</a>"
         "Update 1.14 (Fix 9.00) (PKG - 21.43 MB): ..."
  2. If the page only links to ducumon.click pages, open the base-game link
     (label contains "v1", not Update/DLC) and read "Primary Download (84.40 GB - 1fichier)".
  3. Otherwise open the first 1fichier / mediafire link on the page and read the size.

Usage:
  python fetch-sizes.py                 # update every game, skip ones already sized
  python fetch-sizes.py --force         # re-scrape even games that already have a real size
  python fetch-sizes.py --limit 50      # only process the first 50 (for testing)
  python fetch-sizes.py --workers 8
  python fetch-sizes.py --dry-run       # report what would change, do not write
"""

import argparse
import html
import json
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

DB_FILE = "data/games.json"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0 Safari/537.36"
)
REQUEST_TIMEOUT = 25
PLACEHOLDER_SIZES = {"", "15 GB"}  # values considered "not real yet"

SIZE = r"(\d+(?:[.,]\d+)?)\s*(TB|GB|MB|KB)"
DUCUMON_PRIMARY_RE = re.compile(
    r"Primary Download\s*\(\s*" + SIZE + r"\s*[-\u2013\u2014]", re.I
)
# One pass over a section: an inline "(PKG - 12.3 GB)", a ducumon link, or a file-host link.
ENTRY_RE = re.compile(
    r"\(\s*PKG\s*[-\u2013\u2014]\s*(\d+(?:[.,]\d+)?)\s*(TB|GB|MB|KB)\s*\)"
    r'|<a\b[^>]*href="(https?://ducumon\.click/[^"]+)"[^>]*>(.*?)</a>'
    r'|<a\b[^>]*href="(https?://(?:1fichier|www\.mediafire|mediafire)\.com/[^"]+)"[^>]*>(.*?)</a>',
    re.S | re.I,
)
H3_SPLIT_RE = re.compile(r"<h3[^>]*>", re.I)
REGION_RE = re.compile(r"[-\u2013\u2014]\s*([A-Z]{3})\b")


def clean(fragment):
    return " ".join(re.sub(r"<[^>]+>", " ", fragment).split())


def fmt_size(num, unit):
    value = float(num.replace(",", "."))
    unit = unit.upper()
    if unit == "KB":
        value /= 1024
        unit = "MB"
    if unit == "MB" and value >= 1024:
        value /= 1024
        unit = "GB"
    text = f"{value:.2f}".rstrip("0").rstrip(".")
    return f"{text} {unit}"


def classify(label):
    low = label.lower()
    if "update" in low or "patch" in low:
        return "update"
    if "dlc" in low or "addon" in low or "add-on" in low:
        return "dlc"
    return "game"


def parse_body(body):
    """
    Scan one section body in document order, returning {kind: size-or-url}.
    The text preceding each match labels it (v1/Game -> game, Update -> update, DLC -> dlc).
    """
    found = {}
    cursor = 0
    for m in ENTRY_RE.finditer(body):
        label = clean(body[cursor:m.start()])
        cursor = m.end()
        if m.group(1):
            value = fmt_size(m.group(1), m.group(2))
        elif m.group(3):
            value = html.unescape(m.group(3))
        else:
            value = html.unescape(m.group(5))
        if not label:
            continue
        found.setdefault(classify(label), value)
    return found


def region_rank(head):
    match = REGION_RE.search(head)
    region = match.group(1).upper() if match else ""
    return {"USA": 0, "EUR": 1}.get(region, 2)


def parse_game_page(html):
    """
    Parse a pkgps4 page. Returns {kind: size-string-or-link-url}.
    USA sections are preferred over EUR over anything else.
    """
    sections = []
    parts = H3_SPLIT_RE.split(html)
    for part in parts[1:]:
        head, _, body = part.partition("</h3>")
        data = parse_body(body)
        if data:
            sections.append((region_rank(head), data))

    if not sections:
        return parse_body(html)

    sections.sort(key=lambda s: s[0])
    merged = {}
    for _, data in sections:
        for kind, value in data.items():
            merged.setdefault(kind, value)
    return merged


def http_get(url, session):
    return session.get(url, timeout=REQUEST_TIMEOUT)


def size_from_ducumon(url, session):
    try:
        resp = http_get(url, session)
        if resp.status_code != 200:
            return None
        m = DUCUMON_PRIMARY_RE.search(resp.text)
        if m:
            return fmt_size(m.group(1), m.group(2))
        # Fallback: first size-like token near "Download"
        m = re.search(r"Download[^<\n]{0,80}?" + SIZE, resp.text, re.I)
        if m:
            return fmt_size(m.group(1), m.group(2))
    except requests.RequestException:
        return None
    return None


def size_from_host(url, session):
    try:
        resp = http_get(url, session)
        if resp.status_code != 200:
            return None
        text = resp.text
        # MediaFire: <li>File size: <span>258.81MB</span>
        m = re.search(r'File size:\s*<span>(\d+(?:[.,]\d+)?\s*(?:MB|GB|KB|TB))</span>', text, re.I)
        if m:
            v = m.group(1).replace(' ', '').upper().replace('MB', ' MB').replace('GB', ' GB').replace('KB', ' KB').replace('TB', ' TB')
            # simple
            parts = re.match(r'(\d+(?:[.,]\d+)?)\s*(MB|GB|KB|TB)', v, re.I)
            if parts:
                return fmt_size(parts.group(1), parts.group(2))
        # 1fichier sometimes exposes size; also try generic
        for m2 in re.finditer(SIZE, text, re.I):
            return fmt_size(m2.group(1), m2.group(2))
    except requests.RequestException:
        return None
    return None


def resolve_game(game, session):
    """Return dict of {game/update/dlc: size} for one game (possibly empty)."""
    url = (game.get("links") or {}).get("pkgps4")
    if not url and game.get("downloads"):
        url = game["downloads"][0].get("url")
    if not url:
        return None, "no-source-url"

    try:
        resp = http_get(url, session)
    except requests.RequestException as exc:
        return None, f"request-error: {exc.__class__.__name__}"
    if resp.status_code != 200:
        return None, f"http-{resp.status_code}"

    parsed = parse_game_page(resp.text)
    if not parsed:
        return None, "no-size-found"

    result = {}
    for kind in ("game", "update", "dlc"):
        value = parsed.get(kind)
        if not value:
            continue
        if value.startswith("http"):
            host_url = value
            if "ducumon.click" in host_url:
                size = size_from_ducumon(host_url, session)
            else:
                size = size_from_host(host_url, session)
            if size:
                result[kind] = size
        else:
            result[kind] = value
    if not result:
        return None, "no-size-found"
    return result, None


def main():
    parser = argparse.ArgumentParser(description="Fetch real PS4 game sizes.")
    parser.add_argument("--force", action="store_true", help="Re-scrape games that already have a real size")
    parser.add_argument("--limit", type=int, default=0, help="Only process the first N games")
    parser.add_argument("--workers", type=int, default=6, help="Concurrent request workers")
    parser.add_argument("--delay", type=float, default=0.15, help="Delay between requests per worker (s)")
    parser.add_argument("--dry-run", action="store_true", help="Do not write data/games.json")
    parser.add_argument("--db", default=DB_FILE, help="Path to games.json")
    args = parser.parse_args()

    with open(args.db, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    games = data["games"]

    targets = []
    for game in games:
        current = (game.get("size") or {}).get("game", "")
        if args.force or current in PLACEHOLDER_SIZES:
            targets.append(game)
    if args.limit:
        targets = targets[: args.limit]

    print(f"{len(games)} games total, {len(targets)} to scrape "
          f"({args.workers} workers, force={args.force})")

    import threading
    local = threading.local()

    def worker(game):
        if not hasattr(local, "session"):
            local.session = requests.Session()
            local.session.headers.update({"User-Agent": USER_AGENT})
        sizes, error = resolve_game(game, local.session)
        if args.delay:
            time.sleep(args.delay)
        return game, sizes, error

    updated = 0
    errors = 0
    done = 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(worker, g): g for g in targets}
        for future in as_completed(futures):
            game, sizes, error = future.result()
            done += 1
            if sizes:
                entry = game.setdefault("size", {})
                entry["game"] = sizes.get("game", entry.get("game", "0 MB"))
                if sizes.get("update"):
                    entry["update"] = sizes["update"]
                if sizes.get("dlc"):
                    entry["dlc"] = sizes["dlc"]
                updated += 1
                print(f"[{done}/{len(targets)}] OK  {game['title'][:48]:<48} "
                      f"game={entry['game']} update={entry.get('update')}")
            else:
                errors += 1
                if error not in ("no-size-found",):
                    print(f"[{done}/{len(targets)}] --  {game['title'][:48]:<48} {error}")

    print(f"\nDone: {updated} updated, {errors} without size.")
    if not args.dry_run:
        with open(args.db, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2, ensure_ascii=False)
            fh.write("\n")
        print(f"Wrote {args.db}")
    else:
        print("Dry run: no file written.")


if __name__ == "__main__":
    main()
