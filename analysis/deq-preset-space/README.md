# DEQ morph parameter-space analysis

This workspace studies the parameter geometry of the nonlinear DEQ Morph Bank without changing the live exhibit. It combines the seven protected core examples, the 26 locked Curated anchors, and a complete cursor-paginated snapshot of the shared bank.

The analysis removes two known redundancies before measuring distances:

1. It replaces the 45 coupling coefficients `k` with the exact update products `dt * k`. In the current deterministic field update, `dt` and a reciprocal rescaling of every coefficient are a gauge freedom.
2. It quotients the six RGB relabelings by aligning every state under all channel permutations. The six color identities are treated as one dynamical state, not six independent samples.

The spatial `dx` and `dy` operators are kept distinct. Reflections and quarter turns are only approximate symmetries of the forward-difference browser implementation, so the first pass does not erase them.

## Run it

From PowerShell:

```powershell
.\analysis\deq-preset-space\run-analysis.ps1
```

Use `-SkipFetch` to analyze the checked-in snapshot without contacting the live site. You can also pass full executable paths with `-Python` and `-Node`.

Only NumPy is required. If your Python does not have it:

```powershell
python -m pip install -r .\analysis\deq-preset-space\requirements.txt
```

## Outputs

Generated files go to `analysis/deq-preset-space/output/`:

- `report.md` — readable findings and caveats.
- `summary.json` — machine-readable dimensions, cluster scores, and provenance.
- `coordinates.csv` — aligned PCA coordinates and exploratory cluster assignments.
- `nearest-neighbors.csv` — closest symmetry-aware neighbors for every anchor.
- `cluster-profiles.csv` — compact parameter summaries for the exploratory neighborhoods.
- `pca-map.svg` — first two quotient-space principal components.
- `scree.svg` — explained and cumulative variance.
- `cluster-silhouette.svg` — exploratory partition score versus cluster count.

The clusters are parameter-space neighborhoods, not yet behavior classes. A later phase should render every anchor under controlled seeds and add measurable visual/dynamical descriptors such as spatial spectrum, temporal spectrum, entropy, channel balance, edge density, correlation length, stationarity, and saturation fraction.
