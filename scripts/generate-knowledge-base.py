#!/usr/bin/env python3
"""
Generate enriched polychora.json for the knowledge base.
Parses .off files and combines with tier data to create comprehensive metadata.
"""

import json
import os
import re
from pathlib import Path
from datetime import datetime

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
POLYTOPES_DIR = PROJECT_ROOT / "public" / "data" / "polytopes"
TIER_DATA_DIR = PROJECT_ROOT / "public" / "data" / "polytope-lists"
OUTPUT_DIR = PROJECT_ROOT / "public" / "data" / "knowledge-base"

# VIP polytope metadata (the 16 regular polychora + notable uniforms)
VIP_METADATA = {
    # The 6 Convex Regular Polychora
    "1-pen": {
        "displayName": "Pentachoron",
        "aliases": ["5-cell", "Pentatope", "Hypertetrahedron", "4-Simplex"],
        "schlafli": "{3,3,3}",
        "tier": "vip",
        "isRegular": True,
        "isConvex": True,
        "isSelfDual": True,
        "symmetry": "A4",
        "regiment": "pen",
        "army": "pen",
        "discovery": {
            "year": 1852,
            "discoverer": "Ludwig Schläfli",
            "era": "classical"
        },
        "description": "The pentachoron is the simplest regular polychoron, the four-dimensional analogue of the tetrahedron. Every vertex connects to every other vertex, forming a complete graph K5."
    },
    "2-tes": {
        "displayName": "Tesseract",
        "aliases": ["8-cell", "Octachoron", "Hypercube", "4-Cube"],
        "schlafli": "{4,3,3}",
        "tier": "vip",
        "isRegular": True,
        "isConvex": True,
        "isSelfDual": False,
        "symmetry": "B4",
        "regiment": "tes",
        "army": "tes",
        "dual": "3-hex",
        "discovery": {
            "year": 1852,
            "discoverer": "Ludwig Schläfli",
            "era": "classical"
        },
        "description": "The tesseract is the four-dimensional analogue of the cube. It is bounded by 8 cubic cells and is the only regular polychoron that can tile Euclidean 4-space."
    },
    "3-hex": {
        "displayName": "Hexadecachoron",
        "aliases": ["16-cell", "Aerochoron", "4-Orthoplex"],
        "schlafli": "{3,3,4}",
        "tier": "vip",
        "isRegular": True,
        "isConvex": True,
        "isSelfDual": False,
        "symmetry": "B4",
        "regiment": "hex",
        "army": "hex",
        "dual": "2-tes",
        "discovery": {
            "year": 1852,
            "discoverer": "Ludwig Schläfli",
            "era": "classical"
        },
        "description": "The hexadecachoron (16-cell) is the dual of the tesseract and the four-dimensional analogue of the octahedron. It is bounded by 16 tetrahedral cells."
    },
    "4-ico": {
        "displayName": "Icositetrachoron",
        "aliases": ["24-cell", "Octaplex", "Polyoctahedron"],
        "schlafli": "{3,4,3}",
        "tier": "vip",
        "isRegular": True,
        "isConvex": True,
        "isSelfDual": True,
        "symmetry": "F4",
        "regiment": "ico",
        "army": "ico",
        "discovery": {
            "year": 1852,
            "discoverer": "Ludwig Schläfli",
            "era": "classical"
        },
        "description": "The 24-cell is a remarkable anomaly with no three-dimensional analogue. It is self-dual and possesses unique F4 symmetry that exists only in four dimensions."
    },
    "5-hi": {
        "displayName": "Hecatonicosachoron",
        "aliases": ["120-cell", "Dodecacontachoron", "Hyper-Dodecahedron"],
        "schlafli": "{5,3,3}",
        "tier": "vip",
        "isRegular": True,
        "isConvex": True,
        "isSelfDual": False,
        "symmetry": "H4",
        "regiment": "hi",
        "army": "hi",
        "dual": "6-ex",
        "discovery": {
            "year": 1852,
            "discoverer": "Ludwig Schläfli",
            "era": "classical"
        },
        "description": "The 120-cell is the largest regular convex polychoron, bounded by 120 dodecahedral cells. It represents the four-dimensional analogue of the dodecahedron."
    },
    "6-ex": {
        "displayName": "Hexacosichoron",
        "aliases": ["600-cell", "Tetraplex", "Hyper-Icosahedron"],
        "schlafli": "{3,3,5}",
        "tier": "vip",
        "isRegular": True,
        "isConvex": True,
        "isSelfDual": False,
        "symmetry": "H4",
        "regiment": "ex",
        "army": "ex",
        "dual": "5-hi",
        "discovery": {
            "year": 1852,
            "discoverer": "Ludwig Schläfli",
            "era": "classical"
        },
        "description": "The 600-cell is the densest regular convex polychoron, bounded by 600 tetrahedral cells. Its 120 vertices form the binary icosahedral group."
    },

    # The 10 Schläfli-Hess Star Polychora
    "7-fix": {
        "displayName": "Icosahedral 120-cell",
        "aliases": ["Faceted 600-cell"],
        "schlafli": "{3,5,5/2}",
        "tier": "vip",
        "isRegular": True,
        "isConvex": False,
        "isSelfDual": False,
        "symmetry": "H4",
        "regiment": "fix",
        "army": "ex",
        "discovery": {
            "year": 1852,
            "discoverer": "Ludwig Schläfli",
            "era": "classical"
        },
        "description": "The icosahedral 120-cell is a regular star polychoron composed of 120 icosahedral cells. It shares its vertices with the 600-cell."
    },
    "10-sishi": {
        "displayName": "Small Stellated 120-cell",
        "aliases": ["Stellated 120-cell"],
        "schlafli": "{5/2,5,3}",
        "tier": "vip",
        "isRegular": True,
        "isConvex": False,
        "isSelfDual": False,
        "symmetry": "H4",
        "regiment": "sishi",
        "army": "ex",
        "discovery": {
            "year": 1852,
            "discoverer": "Ludwig Schläfli",
            "era": "classical"
        },
        "description": "The small stellated 120-cell is a regular star polychoron with 120 small stellated dodecahedral cells. It is the colonel of a massive regiment with 26+ members."
    },
    "8-gohi": {
        "displayName": "Great 120-cell",
        "aliases": ["Great Hecatonicosachoron"],
        "schlafli": "{5,5/2,5}",
        "tier": "vip",
        "isRegular": True,
        "isConvex": False,
        "isSelfDual": True,
        "symmetry": "H4",
        "regiment": "gohi",
        "army": "ex",
        "discovery": {
            "year": 1852,
            "discoverer": "Ludwig Schläfli",
            "era": "classical"
        },
        "description": "The great 120-cell is a self-dual regular star polychoron composed of 120 great dodecahedral cells."
    },
    "9-gahi": {
        "displayName": "Grand 120-cell",
        "aliases": ["Grand Hecatonicosachoron"],
        "schlafli": "{5,3,5/2}",
        "tier": "vip",
        "isRegular": True,
        "isConvex": False,
        "isSelfDual": False,
        "symmetry": "H4",
        "regiment": "gahi",
        "army": "ex",
        "discovery": {
            "year": 1852,
            "discoverer": "Ludwig Schläfli",
            "era": "classical"
        },
        "description": "The grand 120-cell is a regular star polychoron composed of 120 dodecahedral cells arranged in a non-convex configuration."
    },
    "12-gishi": {
        "displayName": "Great Stellated 120-cell",
        "aliases": [],
        "schlafli": "{5/2,3,5}",
        "tier": "vip",
        "isRegular": True,
        "isConvex": False,
        "isSelfDual": False,
        "symmetry": "H4",
        "regiment": "gishi",
        "army": "hi",
        "discovery": {
            "year": 1883,
            "discoverer": "Edmund Hess",
            "era": "classical"
        },
        "description": "The great stellated 120-cell is composed of 120 great stellated dodecahedral cells."
    },
    "13-gashi": {
        "displayName": "Grand Stellated 120-cell",
        "aliases": [],
        "schlafli": "{5/2,5,5/2}",
        "tier": "vip",
        "isRegular": True,
        "isConvex": False,
        "isSelfDual": True,
        "symmetry": "H4",
        "regiment": "gashi",
        "army": "ex",
        "discovery": {
            "year": 1883,
            "discoverer": "Edmund Hess",
            "era": "classical"
        },
        "description": "The grand stellated 120-cell is a self-dual regular star polychoron with 120 small stellated dodecahedral cells."
    },
    "11-gaghi": {
        "displayName": "Great Grand 120-cell",
        "aliases": [],
        "schlafli": "{5,5/2,3}",
        "tier": "vip",
        "isRegular": True,
        "isConvex": False,
        "isSelfDual": False,
        "symmetry": "H4",
        "regiment": "gaghi",
        "army": "hi",
        "discovery": {
            "year": 1883,
            "discoverer": "Edmund Hess",
            "era": "classical"
        },
        "description": "The great grand 120-cell is composed of 120 great dodecahedral cells."
    },
    "14-gofix": {
        "displayName": "Great Icosahedral 120-cell",
        "aliases": ["Great Faceted 600-cell"],
        "schlafli": "{3,5/2,5}",
        "tier": "vip",
        "isRegular": True,
        "isConvex": False,
        "isSelfDual": False,
        "symmetry": "H4",
        "regiment": "gofix",
        "army": "hi",
        "discovery": {
            "year": 1883,
            "discoverer": "Edmund Hess",
            "era": "classical"
        },
        "description": "The great icosahedral 120-cell is composed of 120 great icosahedral cells."
    },
    "15-gax": {
        "displayName": "Grand 600-cell",
        "aliases": ["Grand Hexacosichoron"],
        "schlafli": "{3,3,5/2}",
        "tier": "vip",
        "isRegular": True,
        "isConvex": False,
        "isSelfDual": False,
        "symmetry": "H4",
        "regiment": "gax",
        "army": "hi",
        "discovery": {
            "year": 1883,
            "discoverer": "Edmund Hess",
            "era": "classical"
        },
        "description": "The grand 600-cell is composed of 600 tetrahedral cells but shares its vertices with the 120-cell rather than the 600-cell."
    },
    "16-gogishi": {
        "displayName": "Great Grand Stellated 120-cell",
        "aliases": [],
        "schlafli": "{5/2,3,3}",
        "tier": "vip",
        "isRegular": True,
        "isConvex": False,
        "isSelfDual": False,
        "symmetry": "H4",
        "regiment": "gogishi",
        "army": "hi",
        "discovery": {
            "year": 1883,
            "discoverer": "Edmund Hess",
            "era": "classical"
        },
        "description": "The great grand stellated 120-cell is composed of 120 great stellated dodecahedral cells and shares its vertices with the 120-cell."
    }
}

# Category descriptions
CATEGORY_INFO = {
    "Cat1": {"name": "Regular Polychora", "description": "The 16 regular polychora: 6 convex and 10 star forms"},
    "Cat2": {"name": "Truncates", "description": "Truncated forms of the regular polychora"},
    "Cat3": {"name": "Rectates", "description": "Rectified forms of the regular polychora"},
    "Cat4": {"name": "24-cell Family", "description": "Polychora with F4 symmetry based on the 24-cell"},
    "Cat5": {"name": "Bitruncates", "description": "Bitruncated polychora"},
    "Cat6": {"name": "Sphenoverts", "description": "Cantellated polychora with wedge-shaped vertex figures"},
    "Cat7": {"name": "Rhombates", "description": "Rhombated polychora"},
    "Cat8": {"name": "Great Rhombates", "description": "Cantitruncated polychora"},
    "Cat9": {"name": "Omnitruncates", "description": "Fully truncated polychora"},
    "Cat10": {"name": "Prisms", "description": "Prism-based polychora"},
    "Cat19": {"name": "Duoprisms", "description": "Products of two polygons"},
    "Cat23": {"name": "Antiprism Derivatives", "description": "Polychora derived from antiprisms"},
    "CatS1": {"name": "Star Uniforms", "description": "Uniform polychora with star cells or vertex figures"},
}


def parse_off_file(filepath):
    """Parse a 4D OFF file to extract topology counts."""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()

        # Find the counts line (should be line 2, after "4OFF")
        for i, line in enumerate(lines[:5]):
            line = line.strip()
            if line.startswith('4OFF') or line.startswith('OFF'):
                continue
            if line.startswith('#') or not line:
                continue

            # Try to parse as counts
            parts = line.split()
            if len(parts) >= 4:
                try:
                    vertices = int(parts[0])
                    faces = int(parts[1])
                    edges = int(parts[2])
                    cells = int(parts[3])
                    return {
                        "vertices": vertices,
                        "edges": edges,
                        "faces": faces,
                        "cells": cells
                    }
                except ValueError:
                    continue

        return None
    except Exception as e:
        print(f"Error parsing {filepath}: {e}")
        return None


def find_off_file(polytope_id, polytopes_dir):
    """Find the .off file for a given polytope ID."""
    # Try direct match first
    direct_path = polytopes_dir / f"{polytope_id}.off"
    if direct_path.exists():
        return direct_path

    # Try case variations
    for f in polytopes_dir.iterdir():
        if f.is_file() and f.suffix.lower() == '.off':
            # Match by ID (case-insensitive)
            if f.stem.lower() == polytope_id.lower():
                return f
            # Match with spaces replaced by hyphens
            if f.stem.lower().replace(' ', '-') == polytope_id.lower():
                return f
            if f.stem.lower().replace('-', ' ') == polytope_id.lower().replace('-', ' '):
                return f

    return None


def load_tier_data():
    """Load data from tier JSON files."""
    polytopes = {}

    # Load creator tier (has more data)
    creator_path = TIER_DATA_DIR / "creator-tier.json"
    if creator_path.exists():
        with open(creator_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for p in data.get('polytopes', []):
                polytopes[p['id']] = p

    # Load free tier (mark which are free)
    free_path = TIER_DATA_DIR / "free-tier.json"
    if free_path.exists():
        with open(free_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for p in data.get('polytopes', []):
                if p['id'] in polytopes:
                    polytopes[p['id']]['inFreeTier'] = True

    return polytopes


def generate_slug(name, polytope_id):
    """Generate a URL-friendly slug."""
    # For VIPs, use readable names
    slug_map = {
        "1-pen": "pentachoron",
        "2-tes": "tesseract",
        "3-hex": "16-cell",
        "4-ico": "24-cell",
        "5-hi": "120-cell",
        "6-ex": "600-cell",
        "7-fix": "icosahedral-120-cell",
        "8-gohi": "great-120-cell",
        "9-gahi": "grand-120-cell",
        "10-sishi": "small-stellated-120-cell",
        "11-gaghi": "great-grand-120-cell",
        "12-gishi": "great-stellated-120-cell",
        "13-gashi": "grand-stellated-120-cell",
        "14-gofix": "great-icosahedral-120-cell",
        "15-gax": "grand-600-cell",
        "16-gogishi": "great-grand-stellated-120-cell",
    }

    if polytope_id in slug_map:
        return slug_map[polytope_id]

    # For others, use the ID
    return polytope_id.lower()


def main():
    print("Generating knowledge base data...")

    # Load existing tier data
    tier_polytopes = load_tier_data()
    print(f"Loaded {len(tier_polytopes)} polytopes from tier files")

    # Build enriched polychora list
    polychora = []

    for poly_id, poly_data in tier_polytopes.items():
        # Start with tier data
        entry = {
            "id": poly_id,
            "name": poly_data.get('name', poly_id),
            "category": poly_data.get('category', 'Unknown'),
        }

        # Add topology from tier data (already has vertices/edges)
        entry["topology"] = {
            "vertices": poly_data.get('vertices', 0),
            "edges": poly_data.get('edges', 0),
            "faces": 0,  # Will try to get from .off file
            "cells": 0,
        }

        # Try to get full topology from .off file
        off_path = find_off_file(poly_id, POLYTOPES_DIR)
        if off_path:
            topology = parse_off_file(off_path)
            if topology:
                entry["topology"] = topology

        # Add VIP metadata if available
        if poly_id in VIP_METADATA:
            vip = VIP_METADATA[poly_id]
            entry.update({
                "displayName": vip.get("displayName"),
                "aliases": vip.get("aliases", []),
                "schlafli": vip.get("schlafli"),
                "tier": "vip",
                "properties": {
                    "isRegular": vip.get("isRegular", False),
                    "isConvex": vip.get("isConvex", False),
                    "isUniform": True,
                    "isSelfDual": vip.get("isSelfDual", False),
                },
                "symmetry": vip.get("symmetry"),
                "regiment": vip.get("regiment"),
                "army": vip.get("army"),
                "discovery": vip.get("discovery"),
                "description": vip.get("description"),
            })
            if "dual" in vip:
                entry["relationships"] = {"dual": vip["dual"]}
        else:
            # Non-VIP defaults
            entry["tier"] = "standard"
            entry["properties"] = {
                "isRegular": False,
                "isConvex": poly_data.get('category', '') == 'Cat1',
                "isUniform": True,
            }

        # Add URL slug
        entry["slug"] = generate_slug(entry["name"], poly_id)

        # Add viewer tier info
        entry["viewerAccess"] = "free" if poly_data.get('inFreeTier') else "creator"

        # Add file size for loading estimates
        entry["fileSizeKb"] = poly_data.get('file_size_kb', 0)

        polychora.append(entry)

    # Sort by ID (which has numeric prefixes)
    def sort_key(p):
        match = re.match(r'^(\d+)', p['id'])
        if match:
            return (0, int(match.group(1)), p['id'])
        return (1, 0, p['id'])

    polychora.sort(key=sort_key)

    # Build category summary
    categories = {}
    for p in polychora:
        cat = p.get('category', 'Unknown')
        if cat not in categories:
            cat_info = CATEGORY_INFO.get(cat, {"name": cat, "description": ""})
            categories[cat] = {
                "id": cat,
                "name": cat_info["name"],
                "description": cat_info["description"],
                "count": 0
            }
        categories[cat]["count"] += 1

    # Build regiment summary (from VIPs)
    regiments = {}
    for p in polychora:
        reg = p.get('regiment')
        if reg and reg not in regiments:
            regiments[reg] = {
                "id": reg,
                "colonel": p['id'],
                "name": f"{p.get('displayName', p['name'])} Regiment",
                "symmetry": p.get('symmetry'),
                "memberCount": 1,
                "members": [p['id']]
            }
        elif reg:
            regiments[reg]["memberCount"] += 1
            regiments[reg]["members"].append(p['id'])

    # Build final output
    output = {
        "version": "1.0.0",
        "generatedAt": datetime.now().isoformat(),
        "stats": {
            "total": len(polychora),
            "vip": len([p for p in polychora if p.get('tier') == 'vip']),
            "freeViewer": len([p for p in polychora if p.get('viewerAccess') == 'free']),
            "creatorViewer": len([p for p in polychora if p.get('viewerAccess') == 'creator']),
        },
        "polychora": polychora,
        "categories": list(categories.values()),
        "regiments": list(regiments.values()),
    }

    # Write output
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / "polychora.json"

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)

    print(f"\nGenerated {output_path}")
    print(f"  Total polychora: {output['stats']['total']}")
    print(f"  VIP pages: {output['stats']['vip']}")
    print(f"  Free viewer access: {output['stats']['freeViewer']}")
    print(f"  Creator viewer access: {output['stats']['creatorViewer']}")
    print(f"  Categories: {len(categories)}")
    print(f"  Regiments: {len(regiments)}")


if __name__ == "__main__":
    main()
