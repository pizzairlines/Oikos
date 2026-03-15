"""One-off script: deactivate listings above 8500 €/m².

Usage:
    SUPABASE_URL=... SUPABASE_KEY=... python cleanup_expensive.py [--dry-run]

This marks expensive listings as is_active=false rather than deleting them,
preserving data integrity and price history.
"""

from __future__ import annotations

import argparse
import os
import sys

from dotenv import load_dotenv

load_dotenv()

from supabase import create_client


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Count only, don't update")
    parser.add_argument("--max-price-sqm", type=float, default=8500, help="Max price/m² threshold")
    args = parser.parse_args()

    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_KEY", "")
    if not url or not key:
        print("Error: SUPABASE_URL and SUPABASE_KEY must be set")
        sys.exit(1)

    client = create_client(url, key)

    # Count listings above threshold that are still active
    result = (
        client.table("listings")
        .select("id,price_per_sqm,arrondissement,source", count="exact")
        .eq("is_active", True)
        .gt("price_per_sqm", args.max_price_sqm)
        .execute()
    )

    count = result.count or len(result.data)
    print(f"Found {count} active listings above {args.max_price_sqm} €/m²")

    if count == 0:
        print("Nothing to clean up.")
        return

    # Show breakdown by arrondissement
    by_arr: dict[str, int] = {}
    for row in result.data:
        arr = row.get("arrondissement", "unknown")
        by_arr[arr] = by_arr.get(arr, 0) + 1
    for arr in sorted(by_arr):
        print(f"  {arr}: {by_arr[arr]}")

    if args.dry_run:
        print("\n--dry-run: no changes made.")
        return

    # Deactivate them in batches
    ids = [row["id"] for row in result.data]
    batch_size = 100
    deactivated = 0

    for i in range(0, len(ids), batch_size):
        batch = ids[i : i + batch_size]
        client.table("listings").update({"is_active": False}).in_("id", batch).execute()
        deactivated += len(batch)
        print(f"  Deactivated {deactivated}/{len(ids)}...")

    print(f"\nDone: {deactivated} listings deactivated.")


if __name__ == "__main__":
    main()
