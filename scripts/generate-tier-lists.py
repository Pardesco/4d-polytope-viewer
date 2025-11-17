#!/usr/bin/env python3
"""
Generate Tier-Specific Polytope Lists

Creates filtered JSON lists for each license tier:
- Free: ~20 curated polytopes (manually selected)
- Creator: All polytopes <500KB (~1,717 polytopes)
- Professional: All polytopes (~2,670 polytopes)
"""

import json
from pathlib import Path

def load_analysis():
    """Load polytope analysis results."""
    analysis_file = Path(__file__).parent / "polytope-analysis.json"
    with open(analysis_file, 'r', encoding='utf-8') as f:
        return json.load(f)

def get_free_tier_list():
    """Get list of current free tier polytopes from public/data/polytopes."""
    polytopes_dir = Path(__file__).parent.parent / "public" / "data" / "polytopes"

    free_list = []
    for off_file in sorted(polytopes_dir.glob("*.off")):
        polytope_id = off_file.stem

        # Generate display name from ID
        name = polytope_id.replace('-', ' ').title()

        free_list.append({
            "id": polytope_id,
            "name": name,
            "category": "Free Tier",
            "file_size_kb": round(off_file.stat().st_size / 1024, 2)
        })

    return free_list

def generate_creator_tier_list(analysis):
    """Generate Creator tier list: all polytopes <500KB."""
    creator_list = []

    # Include tiny and small polytopes
    for poly in analysis['polytopes_by_size']['tiny']:
        creator_list.append({
            "id": poly['name'],
            "name": poly['name'],
            "category": poly['category'],
            "file_size_kb": poly['size_kb'],
            "source_path": poly['path']
        })

    for poly in analysis['polytopes_by_size']['small']:
        creator_list.append({
            "id": poly['name'],
            "name": poly['name'],
            "category": poly['category'],
            "file_size_kb": poly['size_kb'],
            "source_path": poly['path']
        })

    # Sort by size (smallest first for better UX)
    creator_list.sort(key=lambda x: x['file_size_kb'])

    return creator_list

def generate_professional_tier_list(analysis):
    """Generate Professional tier list: ALL polytopes."""
    pro_list = []

    for size_category in ['tiny', 'small', 'medium', 'large']:
        for poly in analysis['polytopes_by_size'][size_category]:
            pro_list.append({
                "id": poly['name'],
                "name": poly['name'],
                "category": poly['category'],
                "file_size_kb": poly['size_kb'],
                "source_path": poly['path']
            })

    # Sort by size
    pro_list.sort(key=lambda x: x['file_size_kb'])

    return pro_list

def save_tier_list(tier_name, polytope_list, output_dir):
    """Save tier list to JSON file."""
    output_file = output_dir / f"{tier_name}-tier.json"

    tier_data = {
        "tier": tier_name,
        "count": len(polytope_list),
        "polytopes": polytope_list
    }

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(tier_data, f, indent=2, ensure_ascii=False)

    print(f"[{tier_name.upper()}] Generated list with {len(polytope_list)} polytopes -> {output_file.name}")

def main():
    print("="*60)
    print("GENERATING TIER-SPECIFIC POLYTOPE LISTS")
    print("="*60 + "\n")

    # Load analysis
    analysis = load_analysis()

    # Create output directory
    output_dir = Path(__file__).parent.parent / "public" / "data" / "polytope-lists"
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"Output directory: {output_dir}\n")

    # Generate Free tier list (from existing files)
    print("[1/3] Generating Free tier list...")
    free_list = get_free_tier_list()
    save_tier_list("free", free_list, output_dir)

    # Generate Creator tier list (<500KB)
    print("[2/3] Generating Creator tier list (<500KB)...")
    creator_list = generate_creator_tier_list(analysis)
    save_tier_list("creator", creator_list, output_dir)

    # Generate Professional tier list (all)
    print("[3/3] Generating Professional tier list (all polytopes)...")
    pro_list = generate_professional_tier_list(analysis)
    save_tier_list("professional", pro_list, output_dir)

    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"Free tier:         {len(free_list):5d} polytopes (curated)")
    print(f"Creator tier:      {len(creator_list):5d} polytopes (<500KB)")
    print(f"Professional tier: {len(pro_list):5d} polytopes (all)")
    print("\n[SUCCESS] All tier lists generated!")
    print("="*60 + "\n")

if __name__ == '__main__':
    main()
