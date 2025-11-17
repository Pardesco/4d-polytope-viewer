#!/usr/bin/env python3
"""
Polytope Library Analysis Script

Scans all .off files in the Uniforms directory and categorizes them by file size.
Generates statistics and metadata for tier-based filtering.
"""

import os
import json
from pathlib import Path
from collections import defaultdict

def get_file_size_kb(file_path):
    """Get file size in kilobytes."""
    return os.path.getsize(file_path) / 1024

def categorize_by_size(size_kb):
    """Categorize polytope by file size."""
    if size_kb < 100:
        return 'tiny'
    elif size_kb < 500:
        return 'small'
    elif size_kb < 1024:
        return 'medium'
    else:
        return 'large'

def extract_polytope_name(file_path):
    """Extract polytope name from file path."""
    # Get filename without extension
    filename = Path(file_path).stem
    return filename

def analyze_polytopes(uniforms_dir):
    """Scan and analyze all .off files in the uniforms directory."""

    print(f"Scanning directory: {uniforms_dir}")

    results = {
        'total_count': 0,
        'size_distribution': defaultdict(int),
        'polytopes_by_size': {
            'tiny': [],      # <100KB
            'small': [],     # 100-500KB
            'medium': [],    # 500KB-1MB
            'large': []      # >1MB
        },
        'categories': {}
    }

    # Scan all category directories
    for category_dir in Path(uniforms_dir).iterdir():
        if not category_dir.is_dir():
            continue

        category_name = category_dir.name
        category_files = []

        # Find all .off files in this category
        for off_file in category_dir.glob('*.off'):
            try:
                size_kb = get_file_size_kb(off_file)
                size_category = categorize_by_size(size_kb)
                polytope_name = extract_polytope_name(off_file)

                # Relative path from Uniforms directory
                relative_path = str(off_file.relative_to(Path(uniforms_dir).parent))

                polytope_data = {
                    'name': polytope_name,
                    'path': relative_path.replace('\\', '/'),
                    'category': category_name,
                    'size_kb': round(size_kb, 2)
                }

                # Add to size category
                results['polytopes_by_size'][size_category].append(polytope_data)
                category_files.append(polytope_data)

                # Update statistics
                results['total_count'] += 1
                results['size_distribution'][size_category] += 1

            except Exception as e:
                print(f"Error processing {off_file}: {e}")
                continue

        # Store category info
        if category_files:
            results['categories'][category_name] = {
                'count': len(category_files),
                'files': category_files
            }

    # Convert defaultdict to regular dict for JSON serialization
    results['size_distribution'] = dict(results['size_distribution'])

    return results

def print_summary(results):
    """Print analysis summary."""
    print("\n" + "="*60)
    print("POLYTOPE LIBRARY ANALYSIS SUMMARY")
    print("="*60)
    print(f"\nTotal polytopes found: {results['total_count']}")
    print(f"\nSize Distribution:")
    print(f"  Tiny (<100KB):     {results['size_distribution'].get('tiny', 0):4d} files")
    print(f"  Small (100-500KB): {results['size_distribution'].get('small', 0):4d} files")
    print(f"  Medium (500KB-1MB):{results['size_distribution'].get('medium', 0):4d} files")
    print(f"  Large (>1MB):      {results['size_distribution'].get('large', 0):4d} files")

    creator_count = results['size_distribution'].get('tiny', 0) + results['size_distribution'].get('small', 0)
    print(f"\n[CREATOR] Recommended for Creator tier (<500KB): {creator_count} polytopes")
    print(f"[INFO] Categories found: {len(results['categories'])}")

    # Show top 5 largest files
    all_polytopes = []
    for size_cat in results['polytopes_by_size'].values():
        all_polytopes.extend(size_cat)

    all_polytopes.sort(key=lambda x: x['size_kb'], reverse=True)

    print(f"\n[WARNING] Top 5 Largest Files (will crash viewer):")
    for i, poly in enumerate(all_polytopes[:5], 1):
        print(f"  {i}. {poly['name']:20s} - {poly['size_kb']:8.2f} KB ({poly['category']})")

    print("="*60 + "\n")

def main():
    # Paths
    uniforms_dir = Path(r"C:\Users\Randall\Documents\polytope-project\data\Uniforms")
    output_dir = Path(r"C:\Users\Randall\Documents\polytope-web-app\scripts")
    output_file = output_dir / "polytope-analysis.json"

    # Check if source directory exists
    if not uniforms_dir.exists():
        print(f"Error: Source directory not found: {uniforms_dir}")
        return

    # Create output directory if needed
    output_dir.mkdir(parents=True, exist_ok=True)

    # Analyze polytopes
    print("Starting polytope library analysis...")
    results = analyze_polytopes(uniforms_dir)

    # Print summary
    print_summary(results)

    # Save results
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\n[SUCCESS] Analysis complete! Results saved to: {output_file}")
    print(f"[SIZE] Total size on disk: {sum(p['size_kb'] for cats in results['polytopes_by_size'].values() for p in cats) / 1024:.2f} MB")

if __name__ == '__main__':
    main()
