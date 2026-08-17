#!/usr/bin/env python3
"""Symmetry-aware local analysis of the COTM nonlinear DEQ preset bank."""

from __future__ import annotations

import argparse
import csv
import html
import itertools
import json
import math
from pathlib import Path
from typing import Any

import numpy as np


SCRIPT_ROOT = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_ROOT.parents[1]
PERMUTATIONS = list(itertools.permutations(range(3)))
TEMPLATES = ("id", "dx", "dy", "grad", "lap")
PALETTE = (
    "#702b8f", "#00a7a5", "#e36c37", "#d4a72c", "#275d99", "#b23a48",
    "#4f772d", "#9c6644", "#6c757d", "#8338ec", "#1982c4", "#ff595e",
)


def sparse_k(entries: list[tuple[int, int, int, float]]) -> list[float]:
    values = [0.0] * 45
    for destination, source, template, value in entries:
        values[(destination * 3 + source) * 5 + template] = value
    return values


def core_presets() -> list[dict[str, Any]]:
    """Protected built-in examples mirrored from nonlinear-deq.tsx."""

    definitions = [
        ("Nova", .84, 0, .002, [(0, 1, 4, .02), (1, 2, 4, .02), (2, 0, 4, 1)]),
        ("Swirls", 1.38, .11, .001, [(0, 1, 4, .02), (1, 2, 4, .02), (2, 0, 4, 1), (2, 1, 3, .35)]),
        ("Cells", .28, 0, .001, [
            (0, 0, 4, 1), (0, 1, 3, -1), (0, 2, 3, -1), (1, 0, 3, -1),
            (1, 1, 4, 1), (1, 2, 3, -1), (2, 0, 3, -1), (2, 1, 3, -1), (2, 2, 4, 1),
        ]),
        ("Toxic Goo", .08, 0, .002, [
            (0, 0, 2, 2), (0, 0, 4, 1), (0, 1, 3, -1), (0, 2, 1, -10),
            (1, 1, 2, -10), (1, 1, 4, 1), (1, 2, 1, -1.24), (1, 2, 3, -1),
            (2, 0, 1, 10), (2, 0, 3, -1), (2, 2, 2, 2), (2, 2, 4, 1),
        ]),
        ("Fire", .02, .045, .003, [
            (0, 0, 3, -18.4), (0, 0, 4, -.88), (0, 1, 3, 20.4), (0, 1, 4, 1.88),
            (0, 2, 3, 31.88), (0, 2, 4, -22.32), (1, 2, 3, -20.8), (1, 2, 4, 1),
            (2, 0, 4, 1.12), (2, 1, 4, -.42), (2, 2, 4, -5.56),
        ]),
        ("Undulating", 1.38, .11, .001, [
            (0, 1, 4, .02), (1, 2, 4, .02), (2, 0, 4, 1), (2, 1, 3, 6.52), (2, 2, 3, -.34),
        ]),
        ("Cross Fractal", .02, .2, .002, [
            (0, 0, 4, -.88), (0, 1, 4, 1.88), (0, 2, 4, -22.32), (1, 2, 4, 1),
            (2, 0, 4, 1.12), (2, 1, 4, -.42), (2, 2, 4, -5.56),
        ]),
    ]
    return [
        {
            "key": f"core:{name.lower().replace(' ', '-')}",
            "category": "core",
            "createdAt": None,
            "config": {"k": sparse_k(entries), "exponent": [1, 1, 1], "dt": dt, "decay": decay, "noise": noise},
        }
        for name, dt, decay, noise, entries in definitions
    ]


def validate_config(config: dict[str, Any], label: str) -> None:
    if len(config.get("k", [])) != 45 or len(config.get("exponent", [])) != 3:
        raise ValueError(f"{label} has the wrong tensor shape")
    values = [*config["k"], *config["exponent"], config.get("dt"), config.get("decay"), config.get("noise")]
    if not all(isinstance(value, (int, float)) and math.isfinite(value) for value in values):
        raise ValueError(f"{label} contains a non-finite parameter")


def fingerprint(config: dict[str, Any]) -> str:
    normalized = {
        "k": [float(value) for value in config["k"]],
        "exponent": [float(value) for value in config["exponent"]],
        "dt": float(config["dt"]),
        "decay": float(config["decay"]),
        "noise": float(config["noise"]),
    }
    return json.dumps(normalized, sort_keys=True, separators=(",", ":"), allow_nan=False)


def load_records(shared_path: Path, curated_path: Path) -> tuple[list[dict[str, Any]], dict[str, int]]:
    shared_document = json.loads(shared_path.read_text(encoding="utf-8-sig"))
    curated_document = json.loads(curated_path.read_text(encoding="utf-8-sig"))
    shared = [
        {
            "key": f"shared:{int(item['id']):03d}",
            "category": "shared",
            "createdAt": item.get("createdAt"),
            "config": item["config"],
        }
        for item in shared_document["presets"]
    ]
    curated = [
        {
            "key": f"curated:{int(item['id']):03d}",
            "category": "curated",
            "createdAt": item.get("createdAt"),
            "config": item["config"],
        }
        for item in curated_document["presets"]
    ]
    records = [*core_presets(), *curated, *shared]
    for record in records:
        validate_config(record["config"], record["key"])

    unique: dict[str, dict[str, Any]] = {}
    for record in records:
        state = fingerprint(record["config"])
        if state not in unique:
            unique[state] = {**record, "memberships": [record["key"]], "categories": [record["category"]]}
        else:
            unique[state]["memberships"].append(record["key"])
            if record["category"] not in unique[state]["categories"]:
                unique[state]["categories"].append(record["category"])

    counts = {
        "core_named": len(core_presets()),
        "curated_named": len(curated),
        "shared_named": len(shared),
        "named_total": len(records),
        "unique_exact": len(unique),
        "exact_duplicate_memberships": len(records) - len(unique),
        "snapshot_reported_total": int(shared_document.get("reportedTotal", len(shared))),
    }
    return list(unique.values()), counts


def effective_vector(config: dict[str, Any], permutation: tuple[int, int, int]) -> np.ndarray:
    coupling = np.asarray(config["k"], dtype=float).reshape(3, 3, 5) * float(config["dt"])
    order = np.asarray(permutation)
    permuted_coupling = coupling[order][:, order, :]
    exponents = np.asarray(config["exponent"], dtype=float)[order]
    return np.concatenate((permuted_coupling.ravel(), exponents, [float(config["decay"]), float(config["noise"])]))


def robust_scale(values: np.ndarray, fallback: float = 1.0) -> float:
    scale = float(np.quantile(np.abs(values), .9))
    return scale if math.isfinite(scale) and scale > 1e-12 else fallback


def make_orbits(records: list[dict[str, Any]]) -> tuple[np.ndarray, dict[str, float]]:
    identity = np.stack([effective_vector(record["config"], PERMUTATIONS[0]) for record in records])
    scales = {
        "effective_k": robust_scale(identity[:, :45]),
        "exponent_delta": robust_scale(identity[:, 45:48] - 1.0),
        "decay": robust_scale(identity[:, 48]),
        "noise": robust_scale(identity[:, 49]),
    }

    def normalize(vector: np.ndarray) -> np.ndarray:
        result = vector.copy()
        result[:45] /= scales["effective_k"]
        result[45:48] = (result[45:48] - 1.0) / scales["exponent_delta"]
        result[48] /= scales["decay"]
        result[49] /= scales["noise"]
        return result

    orbits = np.stack([
        np.stack([normalize(effective_vector(record["config"], permutation)) for permutation in PERMUTATIONS])
        for record in records
    ])
    return orbits, scales


def quotient_distances(orbits: np.ndarray) -> np.ndarray:
    count = orbits.shape[0]
    distances = np.zeros((count, count), dtype=float)
    for left in range(count):
        differences = orbits[:, :, :] - orbits[left, 0, :]
        row = np.sqrt(np.min(np.sum(differences * differences, axis=2), axis=1))
        distances[left, :] = row
    return (distances + distances.T) * .5


def align_orbits(orbits: np.ndarray, distances: np.ndarray) -> tuple[np.ndarray, np.ndarray, int, int]:
    medoid = int(np.argmin(np.sum(distances, axis=1)))
    reference = orbits[medoid, 0].copy()
    choices = np.full(orbits.shape[0], -1, dtype=int)
    iterations = 0
    for iteration in range(30):
        next_choices = np.argmin(np.sum((orbits - reference[None, None, :]) ** 2, axis=2), axis=1)
        aligned = orbits[np.arange(orbits.shape[0]), next_choices]
        next_reference = np.mean(aligned, axis=0)
        iterations = iteration + 1
        if np.array_equal(next_choices, choices):
            choices = next_choices
            reference = next_reference
            break
        choices = next_choices
        reference = next_reference
    return orbits[np.arange(orbits.shape[0]), choices], choices, medoid, iterations


def principal_components(aligned: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    mean = np.mean(aligned, axis=0)
    centered = aligned - mean[None, :]
    _, singular_values, right_vectors = np.linalg.svd(centered, full_matrices=False)
    coordinates = centered @ right_vectors.T
    eigenvalues = singular_values ** 2 / max(1, aligned.shape[0] - 1)
    explained = eigenvalues / max(float(np.sum(eigenvalues)), 1e-15)
    return coordinates, eigenvalues, explained, mean, right_vectors


def catmull_rom(control_points: np.ndarray, parameters: np.ndarray) -> np.ndarray:
    """Evaluate an open Catmull-Rom spline for parameters in [0, 1]."""

    segments = len(control_points) - 1
    scaled = np.clip(parameters, 0, 1) * segments
    indices = np.minimum(np.floor(scaled).astype(int), segments - 1)
    local = (scaled - indices)[:, None]
    p0 = control_points[np.maximum(indices - 1, 0)]
    p1 = control_points[indices]
    p2 = control_points[np.minimum(indices + 1, segments)]
    p3 = control_points[np.minimum(indices + 2, segments)]
    return .5 * (
        2 * p1
        + (-p0 + p2) * local
        + (2 * p0 - 5 * p1 + 4 * p2 - p3) * local ** 2
        + (-p0 + 3 * p1 - 3 * p2 + p3) * local ** 3
    )


def fit_atlas_path(coordinates: np.ndarray, labels: np.ndarray, control_count: int = 18) -> tuple[np.ndarray, np.ndarray, np.ndarray, int]:
    """Fit and arc-length sample a seven-dimensional principal-curve approximation."""

    main_cluster = int(np.argmax(np.bincount(labels)))
    data = coordinates[labels == main_cluster, :7]
    order = np.argsort(data[:, 0])
    bins = np.array_split(order, control_count)
    controls = np.stack([np.median(data[indexes], axis=0) for indexes in bins])

    for _ in range(8):
        dense_parameters = np.linspace(0, 1, 900)
        dense_curve = catmull_rom(controls, dense_parameters)
        squared = np.sum((data[:, None, :] - dense_curve[None, :, :]) ** 2, axis=2)
        assignments = dense_parameters[np.argmin(squared, axis=1)]
        updated = []
        bandwidth = 1.7 / max(2, control_count - 1)
        for target in np.linspace(0, 1, control_count):
            weights = np.exp(-.5 * ((assignments - target) / bandwidth) ** 2)
            weights /= max(float(np.sum(weights)), 1e-15)
            updated.append(np.sum(data * weights[:, None], axis=0))
        updated = np.stack(updated)
        updated[1:-1] = (updated[:-2] + 2 * updated[1:-1] + updated[2:]) / 4
        controls = updated

    dense_parameters = np.linspace(0, 1, 5000)
    dense_curve = catmull_rom(controls, dense_parameters)
    segment_lengths = np.linalg.norm(np.diff(dense_curve, axis=0), axis=1)
    cumulative = np.concatenate(([0.0], np.cumsum(segment_lengths)))
    cumulative /= max(float(cumulative[-1]), 1e-15)
    targets = np.linspace(0, 1, 257)
    path = np.stack([np.interp(targets, cumulative, dense_curve[:, dimension]) for dimension in range(7)], axis=1)
    tangents = np.gradient(path, axis=0)
    tangents /= np.maximum(np.linalg.norm(tangents, axis=1, keepdims=True), 1e-15)

    radii = []
    for point, tangent in zip(path, tangents):
        differences = data - point
        nearest = np.argsort(np.linalg.norm(differences, axis=1))[:24]
        local = differences[nearest]
        normal = local - (local @ tangent)[:, None] * tangent[None, :]
        radii.append(float(np.quantile(np.linalg.norm(normal, axis=1), .65)))
    radii_array = np.asarray(radii)
    low, high = np.quantile(radii_array, [.12, .88])
    radii_array = np.clip(radii_array, max(float(low), .02), max(float(high), .03))
    return path, tangents, radii_array, main_cluster


def dimension_at(explained: np.ndarray, threshold: float) -> int:
    return int(np.searchsorted(np.cumsum(explained), threshold) + 1)


def intrinsic_dimensions(distances: np.ndarray, neighbors: tuple[int, ...] = (5, 10, 20)) -> dict[str, dict[str, float]]:
    results: dict[str, dict[str, float]] = {}
    ordered = np.sort(np.where(distances > 1e-12, distances, np.inf), axis=1)
    for k in neighbors:
        local = []
        for row in ordered:
            finite = row[np.isfinite(row)]
            if len(finite) < k:
                continue
            radius = finite[k - 1]
            logs = np.log(radius / np.maximum(finite[:k - 1], 1e-15))
            denominator = float(np.mean(logs))
            if denominator > 1e-12:
                local.append(1.0 / denominator)
        results[str(k)] = {
            "median": float(np.median(local)) if local else float("nan"),
            "mean": float(np.mean(local)) if local else float("nan"),
            "samples": len(local),
        }
    return results


def farthest_first(distances: np.ndarray, k: int) -> list[int]:
    medoids = [int(np.argmin(np.sum(distances, axis=1)))]
    while len(medoids) < k:
        separation = np.min(distances[:, medoids], axis=1)
        separation[medoids] = -1
        medoids.append(int(np.argmax(separation)))
    return medoids


def k_medoids(distances: np.ndarray, k: int) -> tuple[np.ndarray, list[int]]:
    medoids = farthest_first(distances, k)
    labels = np.zeros(distances.shape[0], dtype=int)
    for _ in range(50):
        labels = np.argmin(distances[:, medoids], axis=1)
        updated = []
        for cluster in range(k):
            members = np.flatnonzero(labels == cluster)
            if len(members) == 0:
                separation = np.min(distances[:, medoids], axis=1)
                updated.append(int(np.argmax(separation)))
            else:
                within = distances[np.ix_(members, members)]
                updated.append(int(members[np.argmin(np.sum(within, axis=1))]))
        if updated == medoids:
            break
        medoids = updated
    return np.argmin(distances[:, medoids], axis=1), medoids


def silhouette_score(distances: np.ndarray, labels: np.ndarray) -> float:
    unique = np.unique(labels)
    values = []
    for index, cluster in enumerate(labels):
        own = np.flatnonzero(labels == cluster)
        if len(own) <= 1:
            values.append(0.0)
            continue
        own = own[own != index]
        a = float(np.mean(distances[index, own]))
        b = min(float(np.mean(distances[index, np.flatnonzero(labels == other)])) for other in unique if other != cluster)
        values.append((b - a) / max(a, b, 1e-15))
    return float(np.mean(values))


def choose_partition(distances: np.ndarray) -> tuple[np.ndarray, list[int], dict[str, float]]:
    scores: dict[str, float] = {}
    candidates: dict[int, tuple[np.ndarray, list[int]]] = {}
    maximum = min(12, max(2, distances.shape[0] // 8))
    for k in range(2, maximum + 1):
        labels, medoids = k_medoids(distances, k)
        candidates[k] = (labels, medoids)
        scores[str(k)] = silhouette_score(distances, labels)
    chosen = max(candidates, key=lambda value: scores[str(value)])
    labels, medoids = candidates[chosen]
    return labels, medoids, scores


def primary_category(record: dict[str, Any]) -> str:
    for category in ("core", "curated", "shared"):
        if category in record["categories"]:
            return category
    return record["category"]


def svg_frame(width: int, height: int, content: str, title: str) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-label="{html.escape(title)}">'
        '<rect width="100%" height="100%" fill="#f4efdf"/>'
        f'{content}</svg>\n'
    )


def write_scatter(path: Path, coordinates: np.ndarray, labels: np.ndarray, records: list[dict[str, Any]], explained: np.ndarray) -> None:
    width, height = 1100, 760
    left, right, top, bottom = 90, 40, 70, 80
    x = coordinates[:, 0]
    y = coordinates[:, 1] if coordinates.shape[1] > 1 else np.zeros_like(x)
    x_span = max(float(np.ptp(x)), 1e-9)
    y_span = max(float(np.ptp(y)), 1e-9)
    sx = left + (x - float(np.min(x))) / x_span * (width - left - right)
    sy = height - bottom - (y - float(np.min(y))) / y_span * (height - top - bottom)
    parts = [
        f'<text x="{left}" y="38" font-family="Arial,sans-serif" font-size="24" font-weight="700">DEQ quotient-space preset map</text>',
        f'<line x1="{left}" y1="{height-bottom}" x2="{width-right}" y2="{height-bottom}" stroke="#151a22"/>',
        f'<line x1="{left}" y1="{top}" x2="{left}" y2="{height-bottom}" stroke="#151a22"/>',
        f'<text x="{(left+width-right)/2:.1f}" y="{height-25}" text-anchor="middle" font-family="Arial,sans-serif" font-size="15">PC1 · {explained[0]*100:.1f}%</text>',
        f'<text x="24" y="{(top+height-bottom)/2:.1f}" text-anchor="middle" transform="rotate(-90 24 {(top+height-bottom)/2:.1f})" font-family="Arial,sans-serif" font-size="15">PC2 · {explained[1]*100:.1f}%</text>',
    ]
    for index, record in enumerate(records):
        color = PALETTE[int(labels[index]) % len(PALETTE)]
        category = primary_category(record)
        tooltip = html.escape(f"{record['key']} | cluster {int(labels[index])+1} | {', '.join(record['memberships'])}")
        if category == "core":
            shape = f'<path d="M {sx[index]:.2f} {sy[index]-6:.2f} L {sx[index]-6:.2f} {sy[index]+5:.2f} L {sx[index]+6:.2f} {sy[index]+5:.2f} Z" fill="{color}" stroke="#111" stroke-width="1.1"/>'
        elif category == "curated":
            shape = f'<circle cx="{sx[index]:.2f}" cy="{sy[index]:.2f}" r="5" fill="{color}" stroke="#111" stroke-width="1.1"/>'
        else:
            shape = f'<rect x="{sx[index]-3.5:.2f}" y="{sy[index]-3.5:.2f}" width="7" height="7" fill="{color}" opacity=".78"/>'
        parts.append(f'<g><title>{tooltip}</title>{shape}</g>')
    parts.append('<text x="90" y="735" font-family="Arial,sans-serif" font-size="13">▲ core   ● curated   ■ shared · color = exploratory k-medoids neighborhood</text>')
    path.write_text(svg_frame(width, height, "".join(parts), "PCA map of symmetry-aware DEQ presets"), encoding="utf-8")


def write_scree(path: Path, explained: np.ndarray) -> None:
    width, height = 1000, 560
    left, right, top, bottom = 70, 35, 55, 65
    count = min(20, len(explained))
    values = explained[:count]
    cumulative = np.cumsum(values)
    plot_width = width - left - right
    plot_height = height - top - bottom
    bar_width = plot_width / count * .68
    peak = max(float(np.max(values)), 1e-12)
    parts = [
        '<text x="70" y="34" font-family="Arial,sans-serif" font-size="23" font-weight="700">Principal-component variance</text>',
        f'<line x1="{left}" y1="{height-bottom}" x2="{width-right}" y2="{height-bottom}" stroke="#151a22"/>',
    ]
    points = []
    for index, value in enumerate(values):
        center = left + (index + .5) * plot_width / count
        bar_height = float(value) / peak * plot_height * .78
        parts.append(f'<rect x="{center-bar_width/2:.2f}" y="{height-bottom-bar_height:.2f}" width="{bar_width:.2f}" height="{bar_height:.2f}" fill="#702b8f"/>')
        parts.append(f'<text x="{center:.2f}" y="{height-bottom+20}" text-anchor="middle" font-family="Arial,sans-serif" font-size="11">{index+1}</text>')
        points.append(f"{center:.2f},{height-bottom-float(cumulative[index])*plot_height:.2f}")
    parts.append(f'<polyline points="{" ".join(points)}" fill="none" stroke="#e36c37" stroke-width="3"/>')
    parts.append('<text x="760" y="42" font-family="Arial,sans-serif" font-size="13" fill="#e36c37">cumulative variance</text>')
    path.write_text(svg_frame(width, height, "".join(parts), "Scree plot for DEQ preset PCA"), encoding="utf-8")


def write_silhouette(path: Path, scores: dict[str, float]) -> None:
    width, height = 850, 470
    left, right, top, bottom = 70, 35, 55, 65
    items = sorted((int(key), value) for key, value in scores.items())
    values = [value for _, value in items]
    low, high = min(0.0, min(values) - .03), max(values) + .03
    xspan = max(1, items[-1][0] - items[0][0])
    points = []
    parts = [
        '<text x="70" y="34" font-family="Arial,sans-serif" font-size="23" font-weight="700">Exploratory partition score</text>',
        f'<line x1="{left}" y1="{height-bottom}" x2="{width-right}" y2="{height-bottom}" stroke="#151a22"/>',
        f'<line x1="{left}" y1="{top}" x2="{left}" y2="{height-bottom}" stroke="#151a22"/>',
    ]
    for k, value in items:
        x = left + (k - items[0][0]) / xspan * (width-left-right)
        y = height-bottom - (value-low) / max(high-low, 1e-9) * (height-top-bottom)
        points.append(f"{x:.2f},{y:.2f}")
        parts.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="5" fill="#00a7a5"/><text x="{x:.2f}" y="{height-bottom+22}" text-anchor="middle" font-family="Arial,sans-serif" font-size="12">{k}</text>')
    parts.append(f'<polyline points="{" ".join(points)}" fill="none" stroke="#00a7a5" stroke-width="3"/>')
    parts.append(f'<text x="{width/2}" y="{height-20}" text-anchor="middle" font-family="Arial,sans-serif" font-size="14">number of medoids</text>')
    path.write_text(svg_frame(width, height, "".join(parts), "Silhouette scores for exploratory DEQ partitions"), encoding="utf-8")


def write_atlas_model(
    path: Path,
    records: list[dict[str, Any]],
    counts: dict[str, int],
    scales: dict[str, float],
    coordinates: np.ndarray,
    explained: np.ndarray,
    mean: np.ndarray,
    components: np.ndarray,
    labels: np.ndarray,
) -> dict[str, Any]:
    curve, tangents, radii, main_cluster = fit_atlas_path(coordinates, labels)
    round_vector = lambda vector: [round(float(value), 10) for value in vector]
    model = {
        "schemaVersion": 1,
        "title": "DEQ Atlas",
        "dimensions": 7,
        "dataset": {
            **counts,
            "mainFamily": int(np.sum(labels == main_cluster)),
            "outerFamily": int(np.sum(labels != main_cluster)),
        },
        "fit": {
            "method": "seven-dimensional smoothed principal curve with Catmull-Rom arc-length sampling",
            "explainedVariance": round(float(np.sum(explained[:7])), 10),
            "sampleCount": len(curve),
            "excursionScale": .68,
        },
        "featureSpace": {
            "layout": ["effective_k[45]", "exponent_delta[3]", "decay", "noise"],
            "scales": {key: round(float(value), 12) for key, value in scales.items()},
            "mean": round_vector(mean),
            "components": [round_vector(component) for component in components[:7]],
        },
        "curve": {
            "points": [round_vector(point) for point in curve],
            "tangents": [round_vector(tangent) for tangent in tangents],
            "radii": [round(float(radius), 10) for radius in radii],
        },
    }
    path.write_text(json.dumps(model, separators=(",", ":")) + "\n", encoding="utf-8")
    return model


def write_outputs(
    output: Path,
    records: list[dict[str, Any]],
    counts: dict[str, int],
    scales: dict[str, float],
    coordinates: np.ndarray,
    eigenvalues: np.ndarray,
    explained: np.ndarray,
    pca_mean: np.ndarray,
    pca_components: np.ndarray,
    permutation_choices: np.ndarray,
    medoid: int,
    alignment_iterations: int,
    distances: np.ndarray,
    labels: np.ndarray,
    cluster_medoids: list[int],
    silhouette_scores: dict[str, float],
    shared_path: Path,
) -> None:
    output.mkdir(parents=True, exist_ok=True)
    intrinsic = intrinsic_dimensions(distances)
    participation_rank = float(np.sum(eigenvalues) ** 2 / max(float(np.sum(eigenvalues ** 2)), 1e-15))
    cluster_sizes = [int(np.sum(labels == cluster)) for cluster in range(len(cluster_medoids))]
    nearest_order = np.argsort(np.where(distances > 1e-12, distances, np.inf), axis=1)
    cluster_profiles = []
    for cluster, medoid_index in enumerate(cluster_medoids):
        members = np.flatnonzero(labels == cluster)
        configs = [records[int(index)]["config"] for index in members]
        cluster_profiles.append({
            "cluster": cluster + 1,
            "members": len(members),
            "medoid": records[medoid_index]["key"],
            "median_dt": float(np.median([config["dt"] for config in configs])),
            "median_effective_k_rms": float(np.median([
                np.sqrt(np.mean((np.asarray(config["k"], dtype=float) * float(config["dt"])) ** 2))
                for config in configs
            ])),
            "median_active_coefficients": float(np.median([
                np.count_nonzero(np.abs(np.asarray(config["k"], dtype=float)) > 1e-12)
                for config in configs
            ])),
            "median_exponent": float(np.median([np.median(config["exponent"]) for config in configs])),
            "median_decay": float(np.median([config["decay"] for config in configs])),
            "median_noise": float(np.median([config["noise"] for config in configs])),
        })
    atlas_model = write_atlas_model(
        output / "atlas-model.json", records, counts, scales, coordinates, explained,
        pca_mean, pca_components, labels,
    )

    summary = {
        "dataset": counts,
        "source_snapshot": str(shared_path.relative_to(REPO_ROOT)),
        "feature_space": {
            "raw_dimensions": 51,
            "effective_dimensions": 50,
            "exact_gauge_removed": "dt multiplied into all 45 coupling coefficients",
            "color_group": "S3 (six simultaneous source/destination/exponent relabelings)",
            "spatial_group_removed": "none",
            "block_scales": scales,
        },
        "alignment": {
            "reference_medoid": records[medoid]["key"],
            "iterations": alignment_iterations,
            "permutation_histogram": {str(index): int(np.sum(permutation_choices == index)) for index in range(6)},
        },
        "pca": {
            "participation_rank": participation_rank,
            "dimensions_80_percent": dimension_at(explained, .80),
            "dimensions_90_percent": dimension_at(explained, .90),
            "dimensions_95_percent": dimension_at(explained, .95),
            "explained_variance": [float(value) for value in explained],
        },
        "intrinsic_dimension": intrinsic,
        "exploratory_partition": {
            "method": "farthest-first k-medoids on exact S3 quotient distances",
            "chosen_clusters": len(cluster_medoids),
            "silhouette_scores": silhouette_scores,
            "cluster_sizes": cluster_sizes,
            "medoids": [records[index]["key"] for index in cluster_medoids],
            "profiles": cluster_profiles,
            "caveat": "Parameter neighborhoods are not validated visual behavior classes.",
        },
        "atlas_model": {
            "dimensions": atlas_model["dimensions"],
            "main_family": atlas_model["dataset"]["mainFamily"],
            "outer_family_excluded": atlas_model["dataset"]["outerFamily"],
            "path_samples": atlas_model["fit"]["sampleCount"],
            "explained_variance": atlas_model["fit"]["explainedVariance"],
        },
    }
    (output / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")

    with (output / "coordinates.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        component_count = min(12, coordinates.shape[1])
        writer.writerow(["anchor", "memberships", "category", "cluster", "rgb_permutation", *[f"pc{index+1}" for index in range(component_count)]])
        for index, record in enumerate(records):
            writer.writerow([
                record["key"],
                ";".join(record["memberships"]),
                primary_category(record),
                int(labels[index]) + 1,
                "".join(str(value) for value in PERMUTATIONS[int(permutation_choices[index])]),
                *[f"{coordinates[index, component]:.12g}" for component in range(component_count)],
            ])

    with (output / "nearest-neighbors.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["anchor", "rank", "neighbor", "quotient_distance", "same_cluster"])
        for index, record in enumerate(records):
            rank = 0
            for neighbor in nearest_order[index]:
                if not math.isfinite(float(distances[index, neighbor])) or neighbor == index:
                    continue
                rank += 1
                writer.writerow([
                    record["key"], rank, records[int(neighbor)]["key"], f"{distances[index, neighbor]:.12g}",
                    int(labels[index] == labels[neighbor]),
                ])
                if rank == 8:
                    break

    with (output / "cluster-profiles.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow([
            "cluster", "members", "medoid", "median_dt", "median_effective_k_rms",
            "median_active_coefficients", "median_exponent", "median_decay", "median_noise",
        ])
        for profile in cluster_profiles:
            writer.writerow([
                profile["cluster"], profile["members"], profile["medoid"],
                f"{profile['median_dt']:.12g}", f"{profile['median_effective_k_rms']:.12g}",
                f"{profile['median_active_coefficients']:.12g}", f"{profile['median_exponent']:.12g}",
                f"{profile['median_decay']:.12g}", f"{profile['median_noise']:.12g}",
            ])

    closest_pairs = []
    for left in range(len(records)):
        for right in range(left + 1, len(records)):
            closest_pairs.append((float(distances[left, right]), records[left]["key"], records[right]["key"]))
    closest_pairs.sort()

    report = [
        "# DEQ morph parameter-space report",
        "",
        "## Dataset",
        "",
        f"The snapshot contains **{counts['named_total']} named anchors**: {counts['core_named']} protected core examples, {counts['curated_named']} Curated entries, and {counts['shared_named']} shared database entries. Exact configuration deduplication leaves **{counts['unique_exact']} unique stored states** and collapses {counts['exact_duplicate_memberships']} duplicate memberships.",
        "",
        "The live shared-bank total was checked independently against the cursor-paginated API before this snapshot was made.",
        "",
        "## Symmetry reduction",
        "",
        "Each 51-number configuration is represented by 50 effective quantities: the 45 products `dt × k`, three channel exponents, decay, and noise. Every state is then aligned under all six simultaneous RGB relabelings. Distances used for neighborhoods, intrinsic dimension, and clustering are the exact minimum over those six identities.",
        "",
        "`dx` and `dy` remain distinct because the exhibit uses forward finite differences. Treating rotations and reflections as exact would erase a real discretization asymmetry.",
        "",
        "## First-pass structure",
        "",
        f"Aligned PCA needs **{dimension_at(explained, .80)} components for 80%**, **{dimension_at(explained, .90)} for 90%**, and **{dimension_at(explained, .95)} for 95%** of the parameter variance. The covariance participation rank is **{participation_rank:.2f}**.",
        "",
        "Local Levina–Bickel dimension estimates from quotient-space neighbors:",
        "",
        "| Neighborhood | Median dimension | Mean dimension |",
        "|---:|---:|---:|",
    ]
    for key, estimate in intrinsic.items():
        report.append(f"| {key} | {estimate['median']:.2f} | {estimate['mean']:.2f} |")
    report += [
        "",
        f"The best exploratory k-medoids partition in the tested 2–12 range uses **{len(cluster_medoids)} neighborhoods** with silhouette **{silhouette_scores[str(len(cluster_medoids))]:.3f}**. Their sizes are {', '.join(map(str, cluster_sizes))}. This is evidence of parameter-space substructure, not proof that every neighborhood shares one visual behavior.",
        "",
        "| Neighborhood | Members | Medoid | Median `dt` | Median effective-k RMS | Active coefficients | Median exponent | Median decay | Median noise |",
        "|---:|---:|---|---:|---:|---:|---:|---:|---:|",
    ]
    report.extend(
        f"| {profile['cluster']} | {profile['members']} | `{profile['medoid']}` | {profile['median_dt']:.4g} | {profile['median_effective_k_rms']:.4g} | {profile['median_active_coefficients']:.1f} | {profile['median_exponent']:.4g} | {profile['median_decay']:.4g} | {profile['median_noise']:.4g} |"
        for profile in cluster_profiles
    )
    report += [
        "",
        "## Closest symmetry-aware pairs",
        "",
        "| Distance | Anchor A | Anchor B |",
        "|---:|---|---|",
    ]
    report.extend(f"| {distance:.6g} | `{left}` | `{right}` |" for distance, left, right in closest_pairs[:15])
    report += [
        "",
        "## Recommended next layer",
        "",
        "Run each unique anchor from several controlled random seeds and record behavioral descriptors: spatial and temporal spectra, entropy, inter-channel correlation, saturation fraction, edge density, correlation length, stationarity, and attractor lifetime. Clustering the combination of quotient-space parameters and those observed descriptors will distinguish truly shared dynamics from presets that merely have nearby coefficients.",
        "",
        "Candidate generation should initially stay close to well-supported neighborhoods: interpolate in the aligned effective space, reverse the `dt × k` gauge with a conservative time step, simulate offline, reject unstable/saturated runs, and only then offer survivors for human curation.",
    ]
    (output / "report.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    write_scatter(output / "pca-map.svg", coordinates, labels, records, explained)
    write_scree(output / "scree.svg", explained)
    write_silhouette(output / "cluster-silhouette.svg", silhouette_scores)


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--shared", type=Path, default=SCRIPT_ROOT / "data" / "shared-presets.json")
    parser.add_argument("--curated", type=Path, default=REPO_ROOT / "app" / "gallery" / "deq-morph-bank" / "saved-presets.json")
    parser.add_argument("--output", type=Path, default=SCRIPT_ROOT / "output")
    return parser.parse_args()


def main() -> None:
    arguments = parse_arguments()
    records, counts = load_records(arguments.shared, arguments.curated)
    orbits, scales = make_orbits(records)
    distances = quotient_distances(orbits)
    aligned, choices, medoid, iterations = align_orbits(orbits, distances)
    coordinates, eigenvalues, explained, pca_mean, pca_components = principal_components(aligned)
    labels, cluster_medoids, silhouette_scores = choose_partition(distances)
    write_outputs(
        arguments.output, records, counts, scales, coordinates, eigenvalues, explained, pca_mean, pca_components, choices,
        medoid, iterations, distances, labels, cluster_medoids, silhouette_scores, arguments.shared,
    )
    print(
        f"Analyzed {counts['named_total']} named anchors / {counts['unique_exact']} exact states; "
        f"wrote results to {arguments.output.resolve()}"
    )


if __name__ == "__main__":
    main()
