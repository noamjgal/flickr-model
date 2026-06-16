#!/usr/bin/env python
"""Export every Flickr post as a compact record for map visualization."""

import json
from pathlib import Path

INPUT = Path(__file__).resolve().parent.parent / "input" / "flickr_output_Part1_Ex1.txt"
OUTPUT = Path(__file__).resolve().parent.parent / "public" / "data" / "flickr-posts.json"

YEAR_MIN, YEAR_MAX = 2008, 2019


def main() -> None:
    posts: list[list[float | int]] = []
    lons: list[float] = []
    lats: list[float] = []

    with INPUT.open() as f:
        for line in f:
            parts = line.strip().split(",")
            if len(parts) < 11:
                continue

            lon = float(parts[0])
            lat = float(parts[1])
            month = int(parts[4])
            year = int(parts[5])
            category = 0 if parts[9] == "Street" else 1

            lons.append(lon)
            lats.append(lat)
            posts.append([lon, lat, category, year, month])

    payload = {
        "bounds": {
            "minLon": min(lons),
            "maxLon": max(lons),
            "minLat": min(lats),
            "maxLat": max(lats),
        },
        "yearMin": YEAR_MIN,
        "yearMax": YEAR_MAX,
        "monthLabels": [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ],
        "totalPhotos": len(posts),
        "posts": posts,
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w") as out:
        json.dump(payload, out)

    print(f"Wrote {len(posts)} posts to {OUTPUT}")


if __name__ == "__main__":
    main()
