# DEQ morph parameter-space report

## Dataset

The snapshot contains **313 named anchors**: 7 protected core examples, 26 Curated entries, and 280 shared database entries. Exact configuration deduplication leaves **283 unique stored states** and collapses 30 duplicate memberships.

The live shared-bank total was checked independently against the cursor-paginated API before this snapshot was made.

## Symmetry reduction

Each 51-number configuration is represented by 50 effective quantities: the 45 products `dt × k`, three channel exponents, decay, and noise. Every state is then aligned under all six simultaneous RGB relabelings. Distances used for neighborhoods, intrinsic dimension, and clustering are the exact minimum over those six identities.

`dx` and `dy` remain distinct because the exhibit uses forward finite differences. Treating rotations and reflections as exact would erase a real discretization asymmetry.

## First-pass structure

Aligned PCA needs **4 components for 80%**, **7 for 90%**, and **12 for 95%** of the parameter variance. The covariance participation rank is **2.59**.

Local Levina–Bickel dimension estimates from quotient-space neighbors:

| Neighborhood | Median dimension | Mean dimension |
|---:|---:|---:|
| 5 | 2.60 | 8.02 |
| 10 | 2.99 | 5.46 |
| 20 | 3.99 | 5.32 |

The best exploratory k-medoids partition in the tested 2–12 range uses **2 neighborhoods** with silhouette **0.697**. Their sizes are 263, 20. This is evidence of parameter-space substructure, not proof that every neighborhood shares one visual behavior.

| Neighborhood | Members | Medoid | Median `dt` | Median effective-k RMS | Active coefficients | Median exponent | Median decay | Median noise |
|---:|---:|---|---:|---:|---:|---:|---:|---:|
| 1 | 263 | `shared:221` | 0.8437 | 0.2705 | 45.0 | 0.987 | 0.1735 | 0.001189 |
| 2 | 20 | `shared:116` | 1.378 | 1.338 | 45.0 | 1 | 0.6717 | 0.001022 |

## Closest symmetry-aware pairs

| Distance | Anchor A | Anchor B |
|---:|---|---|
| 7.24265e-05 | `core:cross-fractal` | `curated:004` |
| 0.00235167 | `shared:090` | `shared:306` |
| 0.00438091 | `core:undulating` | `shared:079` |
| 0.00657689 | `shared:051` | `shared:052` |
| 0.00707828 | `shared:287` | `shared:303` |
| 0.0148664 | `shared:244` | `shared:248` |
| 0.016069 | `shared:052` | `shared:053` |
| 0.0222012 | `shared:051` | `shared:053` |
| 0.0275265 | `curated:028` | `shared:279` |
| 0.0283133 | `curated:001` | `curated:008` |
| 0.0294941 | `shared:075` | `shared:088` |
| 0.0322373 | `shared:199` | `shared:205` |
| 0.0322631 | `shared:173` | `shared:203` |
| 0.0336127 | `shared:133` | `shared:181` |
| 0.0363399 | `shared:117` | `shared:182` |

## Recommended next layer

Run each unique anchor from several controlled random seeds and record behavioral descriptors: spatial and temporal spectra, entropy, inter-channel correlation, saturation fraction, edge density, correlation length, stationarity, and attractor lifetime. Clustering the combination of quotient-space parameters and those observed descriptors will distinguish truly shared dynamics from presets that merely have nearby coefficients.

Candidate generation should initially stay close to well-supported neighborhoods: interpolate in the aligned effective space, reverse the `dt × k` gauge with a conservative time step, simulate offline, reject unstable/saturated runs, and only then offer survivors for human curation.
