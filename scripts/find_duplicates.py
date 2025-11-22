#!/usr/bin/env python3
"""
Duplicate Polytope Detection Script

Identifies polytopes with identical edge structures (rotation variants)
by computing geometry signatures based on edge length distributions.

This detects:
- Exact duplicates (identical files)
- Rotation variants (same structure, different orientation)
- Coordinate permutations

Output: public/data/duplicates.json
"""

import os
import json
import math
from collections import defaultdict
from pathlib import Path


def parse_off_file(filepath):
    """
    Parse a .off file and extract vertices and edges

    Returns:
        tuple: (vertices, edges) where vertices is list of 4D coordinates
               and edges is list of (v1_idx, v2_idx) pairs
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            all_lines = f.readlines()

        # Find 4OFF marker
        format_line_idx = None
        for i, line in enumerate(all_lines):
            line_upper = line.strip().upper()
            if '4OFF' in line_upper or '4 OFF' in line_upper:
                format_line_idx = i
                break

        if format_line_idx is None:
            return None, None

        # Find header line (after 4OFF, skipping comments)
        header_idx = format_line_idx + 1
        while header_idx < len(all_lines):
            line = all_lines[header_idx].strip()
            if line and not line.startswith('#'):
                break
            header_idx += 1

        # Parse header: vertices faces edges cells
        header_parts = all_lines[header_idx].strip().split()
        num_vertices = int(header_parts[0])
        num_faces = int(header_parts[1])

        # Find vertex section
        vertex_section_idx = None
        for i in range(header_idx + 1, len(all_lines)):
            if all_lines[i].strip() == '# Vertices':
                vertex_section_idx = i + 1
                break

        if vertex_section_idx is None:
            return None, None

        # Parse vertices
        vertices = []
        i = vertex_section_idx
        while len(vertices) < num_vertices and i < len(all_lines):
            line = all_lines[i].strip()
            if line and not line.startswith('#'):
                coords = list(map(float, line.split()))
                if len(coords) >= 4:
                    vertices.append(coords[:4])
            i += 1

        # Find face section
        face_section_idx = None
        for i in range(vertex_section_idx, len(all_lines)):
            if all_lines[i].strip() == '# Faces':
                face_section_idx = i + 1
                break

        if face_section_idx is None:
            return vertices, []

        # Parse faces and extract edges
        edges_set = set()
        i = face_section_idx
        face_count = 0

        while i < len(all_lines) and face_count < num_faces:
            line = all_lines[i].strip()
            if line and not line.startswith('#'):
                # Check if we hit Cells section
                if line == '# Cells':
                    break

                parts = line.split()
                if len(parts) >= 3:
                    n_face_verts = int(parts[0])
                    if len(parts) >= n_face_verts + 1:
                        face_verts = [int(parts[j]) for j in range(1, n_face_verts + 1)]

                        # Extract edges from face
                        for j in range(n_face_verts):
                            v1 = face_verts[j]
                            v2 = face_verts[(j + 1) % n_face_verts]
                            # Store in canonical form (smaller index first)
                            edge = (min(v1, v2), max(v1, v2))
                            edges_set.add(edge)

                        face_count += 1
            i += 1

        edges = list(edges_set)
        return vertices, edges

    except Exception as e:
        print(f"Error parsing {filepath}: {e}")
        return None, None


def compute_edge_lengths(vertices, edges):
    """
    Compute all edge lengths for a polytope

    Returns:
        list: Sorted list of edge lengths (rounded to 4 decimals)
    """
    lengths = []
    for v1_idx, v2_idx in edges:
        if v1_idx >= len(vertices) or v2_idx >= len(vertices):
            continue

        v1 = vertices[v1_idx]
        v2 = vertices[v2_idx]

        # 4D Euclidean distance
        dist_sq = sum((v2[i] - v1[i])**2 for i in range(4))
        dist = math.sqrt(dist_sq)

        # Round to 4 decimals to avoid floating point issues
        lengths.append(round(dist, 4))

    return sorted(lengths)


def compute_vertex_distances(vertices):
    """
    Compute distances of all vertices from origin

    Returns:
        list: Sorted list of vertex distances (rounded to 4 decimals)
    """
    distances = []
    for v in vertices:
        dist_sq = sum(coord**2 for coord in v)
        dist = math.sqrt(dist_sq)
        distances.append(round(dist, 4))

    return sorted(distances)


def compute_geometry_signature(vertices, edges):
    """
    Compute a unique signature for the polytope's geometry

    The signature combines:
    - Edge length distribution (sorted)
    - Vertex distance distribution (sorted)

    This is invariant to rotations and reflections.

    Returns:
        tuple: (edge_lengths_tuple, vertex_distances_tuple)
    """
    if not vertices or not edges:
        return None

    edge_lengths = compute_edge_lengths(vertices, edges)
    vertex_distances = compute_vertex_distances(vertices)

    # Convert to tuples for hashing
    signature = (tuple(edge_lengths), tuple(vertex_distances))
    return signature


def find_duplicates(polytopes_dir='public/data/polytopes'):
    """
    Scan all polytopes and identify duplicates

    Returns:
        dict: Results with duplicate groups
    """
    polytopes_path = Path(polytopes_dir)

    if not polytopes_path.exists():
        print(f"Error: Directory not found: {polytopes_dir}")
        return None

    # Map signatures to polytope filenames
    signature_map = defaultdict(list)

    # Statistics
    total_files = 0
    parsed_files = 0
    failed_files = []

    print(f"Scanning polytopes in: {polytopes_path}")
    print("-" * 60)

    # Scan all .off files
    for off_file in sorted(polytopes_path.glob('*.off')):
        total_files += 1
        filename = off_file.stem  # Name without extension

        # Parse file
        vertices, edges = parse_off_file(off_file)

        if vertices is None or edges is None:
            failed_files.append(filename)
            continue

        if len(vertices) == 0 or len(edges) == 0:
            print(f"Warning: {filename} - Empty geometry (vertices={len(vertices)}, edges={len(edges)})")
            failed_files.append(filename)
            continue

        # Compute signature
        signature = compute_geometry_signature(vertices, edges)

        if signature is None:
            failed_files.append(filename)
            continue

        # Add to map
        signature_map[signature].append({
            'id': filename,
            'vertices': len(vertices),
            'edges': len(edges)
        })

        parsed_files += 1

        if parsed_files % 100 == 0:
            print(f"Processed {parsed_files} files...")

    print("-" * 60)
    print(f"Total files: {total_files}")
    print(f"Successfully parsed: {parsed_files}")
    print(f"Failed to parse: {len(failed_files)}")

    # Identify duplicate groups
    duplicate_groups = []
    unique_polytopes = 0
    total_duplicates = 0

    for signature, polytopes in signature_map.items():
        if len(polytopes) > 1:
            # Found duplicates
            # Use the first one alphabetically as primary
            polytopes_sorted = sorted(polytopes, key=lambda p: p['id'])
            primary = polytopes_sorted[0]
            variants = polytopes_sorted[1:]

            duplicate_groups.append({
                'primary': primary['id'],
                'variants': [p['id'] for p in variants],
                'reason': 'Same edge structure (rotation/reflection variant)',
                'vertex_count': primary['vertices'],
                'edge_count': primary['edges']
            })

            total_duplicates += len(variants)
            unique_polytopes += 1
        else:
            unique_polytopes += 1

    # Sort duplicate groups by primary ID
    duplicate_groups.sort(key=lambda g: g['primary'])

    results = {
        'scan_date': '2025-11-22',
        'total_files_scanned': total_files,
        'successfully_parsed': parsed_files,
        'failed_files': failed_files,
        'unique_polytopes': unique_polytopes,
        'duplicate_groups_found': len(duplicate_groups),
        'total_duplicates': total_duplicates,
        'duplicates': duplicate_groups
    }

    return results


def main():
    """Main entry point"""
    print("=" * 60)
    print("4D Polytope Duplicate Detection Script")
    print("=" * 60)
    print()

    # Find duplicates
    results = find_duplicates()

    if results is None:
        print("Error: Failed to scan polytopes")
        return 1

    # Print summary
    print()
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Unique polytopes: {results['unique_polytopes']}")
    print(f"Duplicate groups: {results['duplicate_groups_found']}")
    print(f"Total duplicate files: {results['total_duplicates']}")
    print()

    # Print duplicate groups
    if results['duplicate_groups_found'] > 0:
        print("DUPLICATE GROUPS:")
        print("-" * 60)
        for group in results['duplicates'][:10]:  # Show first 10
            print(f"  Primary: {group['primary']}")
            print(f"  Variants: {', '.join(group['variants'])}")
            print(f"  Geometry: {group['vertex_count']} vertices, {group['edge_count']} edges")
            print()

        if results['duplicate_groups_found'] > 10:
            print(f"  ... and {results['duplicate_groups_found'] - 10} more groups")
            print()

    # Save to JSON
    output_path = Path('public/data/duplicates.json')
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"Results saved to: {output_path}")
    print()

    return 0


if __name__ == '__main__':
    exit(main())
