#!/usr/bin/env python3
"""
Fix Edge Counts in Tier JSON Files

Reads actual .off files and updates the JSON metadata with correct edge counts.
This ensures the dropdown selector shows accurate edge counts matching the system panel.
"""

import json
from pathlib import Path
import re

def parse_off_header(off_file_path):
    """
    Parse .off file header to extract vertex and edge counts.

    .off file format:
    4OFF
    <vertices> <faces> <edges> <cells>
    ...
    """
    try:
        with open(off_file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        # Find 4OFF marker
        format_line_idx = None
        for i, line in enumerate(lines):
            if '4OFF' in line.upper() or '4 OFF' in line.upper():
                format_line_idx = i
                break

        if format_line_idx is None:
            print(f"  [WARN] No 4OFF marker found in {off_file_path.name}")
            return None, None

        # Find header (next non-comment line after 4OFF)
        header_idx = format_line_idx + 1
        while header_idx < len(lines):
            line = lines[header_idx].strip()
            if line and not line.startswith('#'):
                break
            header_idx += 1

        # Parse header: vertices faces edges cells
        parts = lines[header_idx].split()
        if len(parts) >= 3:
            vertices = int(parts[0])
            edges = int(parts[2])
            return vertices, edges
        else:
            print(f"  [WARN] Invalid header format in {off_file_path.name}")
            return None, None

    except Exception as e:
        print(f"  [ERROR] Failed to parse {off_file_path.name}: {e}")
        return None, None

def fix_tier_json(tier_name, uniforms_dir, json_dir):
    """Fix edge counts for a specific tier JSON file."""

    json_file = json_dir / f"{tier_name}-tier.json"

    if not json_file.exists():
        print(f"[SKIP] {json_file.name} not found")
        return

    print(f"\n[{tier_name.upper()}] Processing {json_file.name}...")

    # Load JSON
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    polytopes = data.get('polytopes', [])
    updated_count = 0
    missing_count = 0

    for poly in polytopes:
        # Construct path to .off file
        # source_path is relative like "Uniforms/Cat1/2-Tes.off"
        source_path = poly.get('source_path', '')

        if not source_path:
            # Try constructing from ID
            off_file = uniforms_dir.parent / "Uniforms" / f"{poly['id']}.off"
        else:
            off_file = uniforms_dir.parent / source_path

        if not off_file.exists():
            # Try searching in category folders
            found = False
            for cat_dir in uniforms_dir.iterdir():
                if cat_dir.is_dir():
                    test_path = cat_dir / f"{poly['id']}.off"
                    if test_path.exists():
                        off_file = test_path
                        found = True
                        break

            if not found:
                print(f"  [MISS] {poly['id']}.off not found")
                missing_count += 1
                continue

        # Parse .off file
        vertices, edges = parse_off_header(off_file)

        if edges is not None:
            old_edges = poly.get('edges', 0)
            if old_edges != edges:
                print(f"  [FIX] {poly['id']}: {old_edges} -> {edges} edges")
                poly['edges'] = edges
                poly['vertices'] = vertices  # Also update vertices
                updated_count += 1
            else:
                # Already correct
                poly['edges'] = edges
                poly['vertices'] = vertices

    # Save updated JSON
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"[{tier_name.upper()}] Updated {updated_count} polytopes, {missing_count} missing files")
    print(f"[{tier_name.upper()}] Saved to {json_file.name}")

def main():
    """Fix edge counts in all tier JSON files."""

    # Paths
    project_root = Path(__file__).parent.parent
    uniforms_dir = Path(r"C:\Users\Randall\Documents\polytope-project\data\Uniforms")
    json_dir = project_root / "public" / "data" / "polytope-lists"

    if not uniforms_dir.exists():
        print(f"[ERROR] Uniforms directory not found: {uniforms_dir}")
        print(f"[INFO] Please update the path in the script")
        return

    if not json_dir.exists():
        print(f"[ERROR] JSON directory not found: {json_dir}")
        return

    print("="*60)
    print("FIX EDGE COUNTS IN TIER JSON FILES")
    print("="*60)

    # Fix each tier
    for tier in ['free', 'creator', 'professional']:
        fix_tier_json(tier, uniforms_dir, json_dir)

    print("\n" + "="*60)
    print("[SUCCESS] Edge count fix complete!")
    print("="*60)

if __name__ == '__main__':
    main()
