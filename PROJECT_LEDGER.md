# COTM Interactive Compendium — Project Ledger

Last organized: 2026-08-03

This is the durable source of truth for the Child of the Machine website: what has shipped, what is being tested, what is planned, what is waiting on source material, and why the work is ordered the way it is. Git preserves the history of this file, so ideas should be revised in place rather than silently discarded.

## How to maintain this ledger

- Give every new item a stable ID before implementation.
- Move items between statuses; do not delete abandoned or superseded ideas. Record the reason instead.
- Update the completed-work log in the same change that implements an item.
- Keep speculative ideas distinct from approved work.
- Treat a Git branch as a reviewable checkpoint. Merge it into `main` after Brenden has tested or approved it.
- Do not deploy documentation-only changes to the live Site.

Status vocabulary:

- **Testing** — built and waiting for Brenden's hands-on check.
- **Next** — recommended for the next focused implementation pass.
- **Planned** — accepted idea, but not the next dependency or priority.
- **Exploration** — promising idea that still needs product or technical design.
- **Waiting** — blocked on source material or a decision from Brenden.
- **Done** — implemented and preserved in Git.

## Standing project safeguards

- The shared **TWISTER** repository is permanently out of scope and must never be written to.
- Existing gallery exhibits are additive history. Do not remove or replace one unless explicitly discussed.
- The current DEQ Morph **Curated** bank is a protected reference set. Do not alter it without an explicit decision.
- Standalone Video Morph v1 is frozen. New renderer work belongs in v2 or a later named version.
- Preserve a Git checkpoint before substantial Site or renderer changes.
- User-triggered **YOU ARE HERE** effects must override spontaneous homepage choreography.
- Persistent counters and preset data must survive Site updates.
- Do not collect visitor data merely because infrastructure exposes it. Any research-interest collection needs an explicit privacy and retention design before launch.

## Current snapshot

### Live museum

The current private-workbench Site contains thirty-two gallery exhibits:

1. Two & Three Bodies
2. Lava Lamp
3. DEQ Sandbox
4. Moiré Field
5. Lissajous Scope
6. Catenary Lab
7. Rotating Rings
8. Nonlinear Oscillator
9. Polarization Space
10. Square Aperture / Fraunhofer Diffraction
11. Perlin Noise
12. Mirror Steering
13. DEQ Morph Bank
14. Voxel Lava Volume
15. Boids
16. Fortune Cookie
17. Spectrum to RGB
18. DEQ Atlas
19. Manifold Golf
20. Pendulum Laboratory
21. The Luckfield
22. Gibberish Generator
23. Ratz
24. Polymorphic Goo
25. ChromaDepth
26. Phosphor Scan
27. Current
28. Material Phases
29. Respiration Monitor
30. Hysteretic Kinetics
31. Harmonic Topography
32. Phase Barrel

The Compendium currently contains five linked theory entries:

1. Harmonic & Nonlinear Oscillations
2. Polarization Space & Waveplates
3. Square Apertures & Fraunhofer Diffraction
4. Perlin Noise & Coherent Randomness
5. Steering Light with a Mirror

Other established systems include:

- randomized **YOU ARE HERE** gags, sounds, priority handling, homepage menu choreography, and a durable press counter;
- shared and saved DEQ presets, randomized morph traversal, rate/wildness controls, photo boundaries, automated cursor motion, Curated/All banks, and six-way color-channel cycling;
- stable mechanical FFT display, a longer grey spectral average, dB/linear display, and an audio-rate nonlinear oscillator;
- public Git history for the museum and separate checkpoints for both standalone video renderers.

### Current test items

- **DEQ-001 through DEQ-004 — Testing:** Auto-cursor frequencies now default to `1 × 0.7`, its shared brush starts at radius `13` and in erase mode, drawing uses a selected color, and photo boundaries use a centered cover crop.
- **DEQ-007 — Testing:** The local symmetry-aware preset observatory snapshots all 280 shared rows, combines them with the protected core and Curated anchors, removes exact `dt × k` and six-way RGB redundancies, and exports reproducible PCA, intrinsic-dimension, neighborhood, cluster, and nearest-neighbor reports.
- **DEQ-009 — Testing:** DEQ Atlas presents the 263-state main family as a seven-dimensional, arc-length-parameterized principal curve controlled by Route Position and deterministic transverse Chaos coordinates. Each coordinate has a full-range coarse slider, a `±0.02` fine-offset slider with `0.00001` resolution, and exact numeric entry. Identical effective coordinates and a restart reproduce the same seeded evolution; the existing Morph Bank remains unchanged.
- **TUNE-001 and TUNE-002 — Testing:** Lava Lamp now starts from Brenden's first approved screenshot values and uses exponential physical-value mapping for all sliders. The cohesion slider caps at `0.5`, surface tension at `8`, and heat decay at `0.1`; manual entry retains wider experimental ranges.
- **MOIRE-001 — Testing:** Moiré Field is being rebuilt as a stark-red optical tabletop with draggable printouts, corrected transparencies, sampled blur glass, and a localized fisheye lens. Preserve the title card's accidental sampling interference as an intentional feature.
- **LAVA3D-001 — Testing:** Voxel Lava Volume extends the lamp into a true three-dimensional cylindrical particle neighborhood, projected as depth-sorted square voxels with orbit and zoom controls.
- **BOIDS-001 — Testing:** Boids presents alignment, cohesion, and separation as a full-screen flock of black triangular agents in a flat baby-blue cloudscape, with live controls in a Moiré-style instrument panel.
- **RATZ-001 — Testing:** Ratz adds a distinct stochastic animal-motion laboratory with intermittent locomotion and intent gates, three-neighbor clique attraction plus short-range Boids-style separation, renewable cheese scent, sparse cat pursuit, immediate and trail-mediated avoidance, per-rat fear hysteresis, panic variance, nonlinear burst-speed shaping, synchronized force updates, a selectable cat-scent gradient view, and toroidal topology across both screen axes.
- **FORTUNE-001 and FORTUNE-004 — Testing:** Fortune Cookie provides a flat-color cracking animation, a curated starter bank, and a durable suggestion box. Brenden's initial owner-submitted batch is approved; later visitor submissions remain pending until a deliberate review pass.
- **COLOR-001 through COLOR-007 and COLOR-009 — Testing:** Spectrum to RGB uses official CIE 1931 2° observer data sampled at 5 nm, live signed D65 sRGB conversion, multiple Lorentzian emitters, direct peak/linewidth gestures, emission presets, gamut warnings, the purple challenge, and a Planck-law blackbody laboratory with a full UV-to-IR spectrum, an iconic linear wavelength view for Thermal temperatures, logarithmic Stellar/Cosmic views, tiered controls reaching the Planck scale, source presets, and a Wien-peak readout.
- **HOME-001 — Testing:** The homepage now introduces COTM as “An interactive museum of emergent phenomenon in physics and art.”
- **HARMONY-001 — Testing:** Harmonic Topography reconstructs the v24 “Herbie colors, fixed tempo” generative instrument as an inspectable Web Audio machine. Its four exact section cycles complete before routing, every harmonic event remains four transport beats, seed 1513 deterministically reproduces the symbolic walk, a six-slot motif FIFO creates visible phrase recurrence, and the compact chord voicer, modal lead, two lower harmony voices, bass vamp, shaker, 32nd hat, pulse, snare, swing, editable routing/palettes/tensions, portable JSON state, probability inspector, and draggable Gaussian tension terrain all remain separate live layers.
- **HARMONY-002 — Testing:** Harmonic Topography can replace the entire four-section architecture with theory-tamed, variable two-to-ten-chord cycles that permit repeated bars, randomized exit routing, and modal-palette mutations. It also includes public-domain score-derived progression presets for Chopin's *Prelude in E minor*, *To a Wild Rose*, *Rhapsody in Blue*, and *The Entertainer*, plus original era-vocabulary presets for Nat King Cole and Louis Armstrong that are explicitly not transcriptions.
- **RHYTHM-001 — Testing:** Phase Barrel is a ten-ring audiovisual polyrhythm sculpture with continuously integrated phase, integer-locked or freeform subdivision, optional uniform frequency acceleration, RMS-like trigger heights, phosphor trajectories, radial chirp percussion, Gaussian temporal coincidence, and switchable response mappings for spacing, rotation, barrel breathing, background flare, and axial motion.
- **GOLF-001 through GOLF-005 — Testing:** Manifold Golf ports the recovered Pygame/OpenGL lineage into a browser laboratory with torus, sphere, Möbius-strip, and Klein-bottle courses; Golf and Pool modes; seam-aware trails and UV maps; equal-mass ball collisions; Gaussian torus/sphere terrain; world-down gravity; and a local normal-field experiment that makes the orientability obstruction visible.

## Prioritization principles

1. Repair and tune existing exhibits before their current behavior becomes the accidental specification.
2. Protect valuable presets and source material before changing algorithms around them.
3. Pair substantial scientific exhibits with Compendium writing and smaller moments of delight.
4. Establish page architecture before adding a large body of stories, music, or product concepts.
5. Design persistence, abuse prevention, privacy, and audio continuity before building UI that depends on them.
6. Let recurring ideation routines propose work; never let them automatically publish it.

## Recommended sequence

The estimates below are relative work sessions, not calendar promises. A session is one coherent build/review cycle.

### Milestone A — Continue gallery momentum (approximately 2–4 sessions)

1. **FORTUNE-001 through FORTUNE-004 are built:** continue collecting later suggestions for deliberate review.
2. Finish testing Spectrum to RGB in **COLOR-001** through **COLOR-007** and **COLOR-009**.
3. Add the sRGB gamut explorer as a third Spectrum to RGB tab under **COLOR-010**.
4. Publish its linked color-perception Compendium sequence under **COLOR-008** after the interaction is trustworthy.

### Milestone B — Build the external reference shelf (approximately 1–2 sessions)

1. Publish the reaction–diffusion, Particle Lenia, and phase-change resources in **REF-001**, **REF-002**, and **REF-004**.
2. Recover the exact Wolfram rule and other must-include links under **REF-003** and **REF-005** rather than guessing.

### Milestone C — Tune and accept existing exhibits (approximately 2–4 sessions)

1. Finish hands-on checks for the DEQ Morph corrections in **DEQ-001** through **DEQ-004**.
2. Continue screenshot-driven parameter tuning and write stable acceptance notes under **TUNE-001** through **TUNE-004**.
3. Tune Moiré, Voxel Lava Volume, Boids, and Fortune Cookie without silently replacing their first approved behavior.

### Milestone D — Rebalance homepage delight (approximately 1–2 sessions)

1. Rebalance substantial YOU ARE HERE effects under **YAH-002**.
2. Explore novelty-weighted selection under **YAH-003** without creating a fixed cycle.

### Milestone E — Major expansions, with identity first (ongoing)

1. **First priority when returning to major architecture:** build the About/portfolio section and homepage QR path in **ABOUT-001** through **ABOUT-004**. This was deliberately deferred from the earlier sequence to preserve gallery momentum.
2. Design the gallery Hall/Wing navigation layer under **HALL-001** through **HALL-005**, while preserving the current gallery index as **See All**.
3. Establish Recommended Reading and Tales from the Ruliad structures in **READ-001** and **RULIAD-001** through **RULIAD-003**.
4. Build persistent Music playback before adding instruments and recordings.
5. Add Private Research interest signals only after the privacy and retention design is explicit.
6. Open **The Outernet** gradually, beginning with one discoverable anomaly and one complete Easter-egg-titled room.

### Recurring cadence

- **Daily proposal routine:** suggest a small batch of new YOU ARE HERE gags; discuss before implementation.
- **Daily archive-mining routine:** suggest a small batch of gallery/Compendium candidates from the connected knowledge source; discuss before implementation.
- **Weekly triage:** promote only a few suggestions into this ledger, combine true duplicates, and preserve the rest in an idea inbox.
- **Each implementation cycle:** one stable checkpoint, one user test, then a merge decision and ledger update.

## Detailed backlog

### Operations and project memory

- **OPS-001 — Done — Standalone v2 crisp output.** Brenden confirmed the compatible MP4 plays correctly and preserves the deliberately blocky pixels. The renderer and its version history are now on `main`.
- **OPS-002 — Done — Durable project ledger.** Keep this file current and versioned in GitHub.
- **OPS-003 — Next — Completed-work discipline.** Every future implementation should update this ledger and cite its task IDs in the commit or pull-request description.
- **OPS-004 — Planned — Source-material register.** When screenshots, links, stories, presets, audio, or mockups arrive, record their repository location and usage status here.

### References and inspiration links

- **REF-001 — Next — Reaction–diffusion resources.** Publish a curated set of useful interactive websites and primary references.
- **REF-002 — Next — Particle Lenia resources.** Link strong demonstrations/references and Brenden's own video about Particle Lenia and emergent phenomena.
- **REF-003 — Waiting — Wolfram no-repeat rule.** Recover the exact rule discussed previously that generated the non-repeating sequence, then link the relevant Wolfram material. Do not guess the rule number.
- **REF-004 — Next — Phase-change simulation resources.** Curate sites that demonstrate phase-change materials and related dynamics.
- **REF-005 — Waiting — Must-include links.** Search an explicitly connected/indexed conversation source for prior discussions, but retain every link Brenden manually supplies even when a replacement looks more authoritative.

### DEQ Morph corrections

- **DEQ-001 — Testing — Auto-cursor defaults.** X frequency starts at `1`, Y frequency at `0.7`, and the shared brush radius starts at `13` instead of `7`.
- **DEQ-002 — Testing — Photo boundary fill.** Uploaded images fill the simulation field with a centered, aspect-preserving cover crop instead of letterboxing.
- **DEQ-003 — Testing — Eraser default.** The manual and automated cursor begin in erase mode.
- **DEQ-004 — Testing — Selectable drawing color.** Random per-frame drawing color has been replaced by a color picker, initially cyan.
- **DEQ-005 — Safeguard — Preserve tuned behavior.** Do not disturb the established continuous morph algorithm, Curated bank, timing, all-bank presets, or color-cycle routing while making these UI/default changes.
- **DEQ-006 — Done — Complete preset retrieval.** Stable ID-cursor pagination now returns and loads all 280 shared rows across two pages, alongside a true database total and visible complete-bank status. Every stored row and the protected Curated bank remain intact.
- **DEQ-007 — Testing — Symmetry-aware preset observatory.** The local analysis represents the tensor through effective couplings `dt × k`, quotients exact distances by all six RGB permutations, preserves the forward-difference distinction between `dx` and `dy`, snapshots the complete bank, and exports PCA, intrinsic-dimension, k-medoids, cluster-profile, and nearest-neighbor artifacts. The first snapshot contains 313 named anchors and 283 exact unique configurations.
- **DEQ-008 — Next — Behavioral descriptors and candidate generation.** Simulate anchors from controlled common seeds, measure spatial and temporal spectra, entropy, persistence, channel correlation, saturation, motion, and perturbation sensitivity, then learn positive-state neighborhoods and generate candidates locally along their tangent directions. Add explicit interesting/dull/broken feedback before training a discriminative acceptance model.
- **DEQ-009 — Testing — Two-coordinate DEQ Atlas.** Add an independent gallery entry that navigates a frozen seven-dimensional principal curve through the 263-state main preset family. One exact numeric coordinate selects arc length; the second applies a smooth deterministic transverse displacement scaled by local preset support. Use separate coarse and fine sliders for both coordinates because interesting behavior occupies narrow intervals. Preserve repeatable seeded restarts, keep the 20-state outer family out of the first fitted trunk, and do not alter the original Morph Bank.

### Gallery-wide tuning

- **TUNE-001 — Testing / Next — Defaults and ranges.** Lava Lamp's first test defaults are heater gain `250`, heat decay `0.01`, buoyancy `699`, cohesion `0.15`, surface tension `2.65`, and `180` particles. Its slider caps are cohesion `0.5`, surface tension `8`, and heat decay `0.1`. A second screenshot preset uses heater gain `81`, heat decay `0.00119`, buoyancy `465`, cohesion `0.125`, surface tension `6.416`, and `1,600` particles. A third tall-column preset uses heater gain `121.7`, heat decay `0.0009`, buoyancy `559`, cohesion `0.137`, surface tension `0.746`, and `1,600` particles. A fourth tall-plume preset uses heater gain `94.8`, heat decay `0.00119`, buoyancy `701`, cohesion `0.03`, surface tension `3.377`, `180` particles, a `1×` heater, and a `1 × 1.352` domain. Continue the screenshot-driven pass for the remaining exhibits after this test.
- **TUNE-002 — Testing / Next — Logarithmic control mapping.** Lava Lamp sliders are now linear in log-space—equivalently, slider position maps exponentially into the physical value—while manual numeric entry retains wider ranges. Apply the same pattern selectively to other parameters that span orders of magnitude after validating this interaction.
- **TUNE-003 — Planned — Per-exhibit acceptance notes.** Record the approved default, minimum, maximum, mapping, and units for each parameter so later visual cleanup cannot silently retune the physics.
- **TUNE-004 — Testing — Lava domain scaling and presets.** Particle-count changes suggest a square-root-scaled simulation width and height, calibrated so the first `1,600`-particle preset has twice the two-dimensional area of the `180`-particle baseline. Width and height remain independently adjustable and apply on reset. Heater footprint is independently adjustable from `0.25×` through `2×`; the third preset records the deliberately narrow, tall `1.035 × 3` domain and `1.452×` heater from its source screenshot.

### Moiré Field development

- **MOIRE-001 — Testing — Red optical tabletop.** Replace the full-screen generated pattern with a stark-red table holding a draggable generated-field printout, a white four-quadrant reference printout (rings, squares, chevrons, and alternating line weights), and the existing ring/linear transparencies. The transparencies use equal-width black bars and openings, and every draggable label has a fixed white sans-serif fill with black outline. Linear and ring spacing controls use exponential mapping from `0.125 px` through `48 px`, with manual entry down to `0.05 px`, so deliberate aliasing can beat against the display's own pixel grid.
- **MOIRE-002 — Testing — Sampled lenses.** Preserve the title card's fortuitous blur-sampling interference and explicitly treat it as part of the exhibit. Add a top-layer draggable circular blur using the same browser backdrop sampling plus a localized canvas fisheye that inverse-maps pixels from the optical tabletop beneath it.

### Voxel Lava Volume

- **LAVA3D-001 — Testing — Three-dimensional particle volume.** Extend the tuned Lava Lamp forces into a cylindrical XYZ neighborhood and render the result as deliberately chunky, depth-sorted square voxels. Keep the first browser pass dependency-light while supporting drag orbit, wheel or keyboard zoom, auto-orbit, pause, heater control, reset, exponential parameter controls, and a visible frame-rate readout.
- **LAVA3D-002 — Tuning — Performance and force calibration.** After hands-on testing, benchmark the useful browser particle ceiling on desktop and mobile, then tune three-dimensional cohesion, surface tension, heat, buoyancy, voxel size, and default camera framing without silently changing the established 2-D lamp.

### Boids

- **BOIDS-001 — Testing — Windowless flock.** Render a full-viewport wraparound sky containing simple black triangular agents and flat cartoon clouds built from white circles. The lower-right flight computer exposes alignment, cohesion, separation, neighborhood radius, cruise speed, cursor pressure, and staged flock size while preserving the graphic directness of the Moiré exhibit.
- **BOIDS-002 — Tuning — Rule balance and scale.** After hands-on testing, tune the default flock density and rule strengths for desktop and mobile, then save any especially expressive parameter combinations as named presets.

### Ratz

- **RATZ-001 — Testing — Stochastic behavior field.** Keep Ratz as its own Gallery identity while expressing its clocks, telegraph gates, noisy heading plans, and saturating burst response through a reusable stochastic-agent core. Rats synchronously evaluate cheese scent, no more than three nearby social partners, the cat, and the cat's exponentially decaying trail before any positions advance. The arena is a true two-axis torus: agents and visual copies wrap, and every force, target choice, collision, cheese encounter, trail diffusion, and trail gradient uses the matching periodic topology.
- **RATZ-002 — Testing — Cat pursuit and disappearance.** The cat chooses one target randomly from its ten nearest rats during sparse high-speed pursuit bursts. Rats saturate below the cat's effective maximum speed, cheese respawns when reached, caught rats disappear, Cat can be toggled, and Reset restores the selected population.
- **RATZ-003 — Testing — Fear hysteresis and field inspection.** Each rat low-pass filters proximity and recent trail exposure into a persistent fear state that strengthens avoidance and panic variance after the immediate threat passes. Expose separate Fear strength and memory controls plus hidden, density, gradient-arrow, and combined scent-field views.
- **RATZ-004 — Review — Motion character and mobile scale.** The first tuning pass adds explicit separation strength/radius, smoothly eases noisy headings toward randomly refreshed targets, lengthens the default rat/cat correlation times, raises the rat and cat speed ceilings to `800 px/s` and `1200 px/s`, and substeps fast motion to protect encounters. A single mobile-friendly control hides both title and laboratory panels, leaving only a restore button over the unobstructed simulation. Continue hands-on tuning without collapsing the deliberately intermittent little bursts into ordinary smooth flocking.
- **RATZ-005 — Review — Brenden mobile preset.** Adopt the second photographed review settings as defaults: rat/cat correlation `5 s / 4.1 s`, wiggle `4`, panic `8`, clique attraction/radius `2.5 / 32 px`, separation/radius `6.9 / 42 px`, cheese `4.25`, pursuit `1.9`, cat repulsion `5`, trail avoidance/decay `3.35 / 17.1 s`, Fear/memory `8 / 8.85 s`, burst gain/curve `1.45 / 1.1`, and rat/cat maxima `325 / 465 px/s`.
- **RATZ-006 — Review — Drawable briar refuges.** Hidden-UI mode becomes a touch and pointer drawing surface for toroidally wrapped briar patches. Ratz ignore and can shelter inside the bushes; the cat receives a strong anticipatory repulsion plus hard collision rejection and escape recovery so it cannot tunnel into the refuge at high speed. The laboratory can clear the briars independently, while Reset clears the complete field.

### Polymorphic Goo

- **GOO-001 — Review — Shared Fourier geometry engine.** Recover the original triangle → square → pentagon → hexagon Fourier-descriptor loop with cosine interpolation, dispersive rotation, a correlated fourfold harmonic wobble, stable recentering, and layered warm toon rims. Keep the contour and renderer in one shared module consumed by both Gallery and Music rather than allowing two implementations to drift.
- **GOO-002 — Review — Five-band modulation laboratory.** The Gallery instrument independently couples shape, rotation, wobble, shadow thickness, and rim roundness to a direct slider, smooth correlated random motion, or an uploaded audio file. Audio uses instantaneous RMS from low, mid, high, and two narrower transition bands; overall waveform RMS optionally controls hue-traversal speed.
- **GOO-003 — Review — Coupling equalizer and waveform drive.** Give the low, mid, two transition, high, and overall audio channels independent 0–8× coupling trims with conservative sub-unity defaults so ordinary music retains headroom instead of pinning every morph parameter while still permitting deliberately extreme drive. Both the Gallery instrument and Sold As Is rooms can switch between logarithmically compressed, smoothed RMS envelopes and true parallel band-filtered time-domain waveforms; zero coupling is genuinely still or flat, signed waveform values can reverse rotation and hue travel, manual controls reach substantially wilder upper ranges, and the same shared filter-bank implementation keeps both applications aligned.
- **GOO-004 — Review — Slider-bank randomizer.** A single deliberate button scrambles every numeric geometry, hue, and audio-equalizer slider while leaving source modes, loaded audio, and the established defaults untouched.
- **MUSIC-013 — Review — Polymorphic Goo boundary geometry.** Every Sold As Is listening room can replace album art with the shared live goo raster before it enters the existing artwork-plus-spectrum DEQ boundary path. Track audio maps the same five RMS bands to the reusable geometry, and the hue can traverse at an overall-volume-dependent rate or a steady slow drift.

### ChromaDepth kinetic sculpture

- **CHROMA-001 — Review — Perspective chromadepth particle laboratory.** Project a toroidally wrapped 3D particle field onto Canvas with inverse-distance size, independently adjustable camera distance and perspective, camera orbiting, and far-to-near painter sorting. Use a pure-black field and unoutlined, maximum-saturation/value particles; switch between a tunable sigmoid RGB-anchor transfer that compresses troublesome mixed yellow/cyan intervals and a discrete mode containing only pure R, G, and B depth layers. Speed continuously morphs each primitive from a circle toward a square without altering its depth color.
- **CHROMA-002 — Review — Generalized multi-species dynamics.** Run one to three independently tuned particle species through a shared force engine combining vortex circulation, central gravity, thermal buoyancy, viscosity, cohesion/surface tension, Boids alignment and separation, correlated stochastic motion, gated activity, cross-species attraction, panic, and fear memory. Support at least 1,400 particles through bounded stochastic neighbor sampling rather than an all-pairs solve.
- **CHROMA-003 — Review — Mean-centered audio modulation matrix.** Reuse the shared six-band analysis vocabulary and let six routable log-RMS sources target selected particle parameters for all or one species. Subtract a slow per-band mean before applying bipolar route strength so audio fluctuates about each static base setting rather than replacing it.
- **CHROMA-004 — Review — Slider-bank randomizer.** Rapidly scramble all global projection controls, every species parameter bank, and every modulation strength without changing color mode, route assignments, audio, or defaults; reseed the field against the new values immediately.

### Phosphor Scan

- **PHOS-001 — Review — Portable serial-raster engine.** Draw a white, image, or realtime video source as an explicitly ordered raster of individually excited phosphor strips over an exponentially decaying field. Slow draw rates expose the traversal dot by dot, while fast rates batch only consecutive raster samples into streaks and cap suspended-tab backlog so the scan resumes honestly rather than racing through stale work.
- **PHOS-002 — Review — Waveform and evolving-noise deflection.** Let uploaded modulation audio displace each scanline directly through its time-domain waveform or drive a shared one-dimensional fractal-noise field with independently controlled roughness, harmonic count, spatial scale, evolution rate, strength, scan density, strip width, blue underglow, and persistence.
- **PHOS-003 — Review — Complete audio coupling matrix.** Reuse the shared six-band analyzer and expose all 66 bipolar band-to-parameter routes. Lightly smoothed log-RMS is mean-centered per band before modulation, preserving every static control as the operating point and keeping the renderer independent from the Gallery laboratory so Sold As Is can consume the same engine later without a fork.
- **PHOS-004 — Review — Slider-bank randomizer.** Scramble the complete raster-parameter bank and all 66 bipolar coupling strengths in one action while retaining the active source, deflection mode, loaded files, accumulated phosphor field, and original defaults.

### Current

- **CURRENT-001 — Review — Doodle-driven conservative Laplace solver.** Recover the historic Current idea as Gallery exhibit 27 with pointer/touch drawing, grayscale mask import, Funnel, Maze, Lattice, Islands, and Empty material presets. Solve `∇·(σ∇V)=0` live with simultaneous Jacobi updates, harmonic face conductances, insulating un-driven walls, selectable horizontal/vertical/diagonal electrodes, and adjustable relaxation, batch size, resolution, and six decades of conductivity contrast.
- **CURRENT-002 — Review — Side-by-side convergence instrument.** Continuously render a psychedelic orange/purple/cyan/lime/sunflower cyclic potential map beside a logarithmic current-magnitude heat map with magnitude-scaled quiver arrows. Expose color-band density, phase, arrow spacing/gain, pause, single-cycle stepping, reset, RMS residual, largest nudge, and source/sink flux mismatch so useful convergence and numerical failure remain visible rather than hidden behind a fixed iteration count.

### Material Phases

- **PHASE-001 — Review — Dual-screen phase laboratory.** Gallery exhibit 28 uses a Nintendo-DS-like instrument: an upper particle/domain simulation and a lower pointer/touch phase diagram. Every diagram supports direct numerical entry as well as cursor control, and changing thermodynamic coordinates immediately retunes the live material.
- **PHASE-002 — Review — Magnetic ordering.** A finite periodic lattice of freely rotating planar spins combines nearest-neighbor exchange, weak easy-axis anisotropy, thermal noise, and a horizontal external field. The normalized temperature-field diagram exposes a finite-grid Curie-like ordering crossover while explicitly avoiding calibration to a named magnetic material.
- **PHASE-003 — Review — Steel grains and thermal processing.** A Potts-style grain field uses curvature-driven boundary motion, temperature-dependent mobility, carbon-defect pinning, melt disorder, and a rapid-cooling martensite cue. Its approximate Fe-C diagram and direct controls share a four-stage heat ramp {attack}, equalize {decay}, soak {sustain}, and cooldown {release} envelope without claiming CALPHAD, TTT, or CCT accuracy.
- **PHASE-004 — Review — Au-Si eutectic and water.** A conservative phase-field sketch begins with stacked Au/Si films, mixes above a composition-dependent liquidus, and demixes during cooling around the 18.6 atomic % Si / 363 °C eutectic anchor recovered from Brenden's mesopyramid process history. A separate schematic IAPWS-anchored water map spans vapor, liquid, supercritical water, and ice Ih/III/V/VI/VII, with particles settling into visually distinct lattices after each phase-space selection.
- **PHASE-005 — Review — Conservative inventory, universal envelopes, and phase-space loci.** The Au-Si solver now computes chemical potential and field updates in separate buffers, projects every completed cycle back onto the selected bounded composition, and reports live Au/Si percentages. Its independent temperature slider changes thermal state without resetting the material. All four systems have independent ADSR-style thermal envelopes; magnetic, steel, and water diagrams can traverse an adjustable circular locus whose center is set by touch or pointer. Starting a thermal envelope parks the locus, while starting the locus stops the envelope. The Material Phases Gallery card now establishes its own positioning context so its animated field remains inside exhibit 28.
- **PHASE-006 — Review — Diagram-space loci and gravitational segregation.** Circular traversals now use one bounded screen-space radius for both the drawn guide and live cursor, then invert each diagram axis—including logarithmic water pressure—back into physical values. Au-Si mobility extends to 7.5 relative (five times the previous control ceiling) with stable numerical substeps. Optional density buoyancy applies simultaneous conservative vertical transport so denser gold settles while lighter silicon rises without changing the selected inventory.
- **PHASE-007 — Review — Continuous steel sweep and expanded magnetic temperatures.** Crystal tempering now has the same non-destructive temperature scrubber as Au-Si, leaving the grain and defect state intact while temperature moves. Magnetic temperature spans `-1.8` through `3.6 T/Tc`; the negative effective-temperature branch visibly inverts local spin alignment and is explicitly described as a bounded population inversion rather than sub-zero absolute temperature.

### Respiration Monitor and Hysteretic Kinetics

- **LWS-001 — Review — Draggable light-wave respiration instrument.** Gallery exhibit 29 pairs a curved moving torso segment with a draggable and rotatable source/receiver, explicit Lambertian range and angle dependence, cloth absorption, quantization, noise, lock-in filtering, and simultaneous motion/ideal/measured traces. The stochastic breath generator follows the published correlated amplitude and instantaneous-frequency construction with a sixth-power pulse, while the page plainly identifies itself as an explanatory simulation rather than a calibrated medical device.
- **LWS-002 — Review — Research pathway.** Link the exhibit in both directions with the Noncontact Respiration Monitoring Private Research archive so the interactive explanation and preserved research record remain distinct but adjacent.
- **KINETICS-001 — Review — Shared live-loop and sweep laboratory.** Gallery exhibit 30 provides heuristic diode/two-reservoir, SRH plus four-channel TAAM, general recombination-mixer, and explicitly experimental amphoteric modes. A shared parameter bank drives a persistent CRT live-loop view or a logarithmically climbing rate-sweep theater without resetting controls between views.
- **KINETICS-002 — Review — Stable browser reduction and provenance boundary.** Preserve the current Mesopyramids capture-channel structure while using bounded positivity-preserving population updates and normalized coefficients for responsive browser exploration. Link directly to the Mesopyramids archive, label the amphoteric extension as frontier work, and do not present the browser reduction as a replacement for the stiff native research solver.

### YOU ARE HERE and homepage behavior

- **HOME-001 — Testing — Museum identity line.** Replace the longer “evolving cabinet” introduction with the concise homepage statement “An interactive museum of emergent phenomenon in physics and art.”
- **YAH-001 — Planned — Daily gag proposals.** Generate a few candidates daily, sometimes informed by the connected conversation archive and sometimes by slapstick, absurdity, or fitting pop-culture references. The routine proposes; Brenden chooses what ships.
- **YAH-002 — Next — Probability rebalance.** Make full visual/physical effects more common, text-or-sound-only outcomes less common, and the rarest events less vanishingly rare.
- **YAH-003 — Exploration — Novelty-weighted selection.** As the gag library grows, prefer a recent-history/novelty system over rigid rarity tiers so repeat clicks remain surprising without forcing users through a fixed cycle.
- **YAH-004 — Safeguard — Interaction authority.** A direct button press always takes control from ambient menu animation until the selected gag finishes or intentionally navigates away.
- **YAH-005 — Working — Museum Pneumatic Tube.** Vacuum the YOU ARE HERE control into a theatrical museum tube, then return it stamped `CURRENT LOCATION: RECEIVED`; preserve the real control, reduced-motion fallback, captions, and optional audio.
- **YAH-006 — Working — Elevator to This Floor.** Close brass elevator doors over YOU ARE HERE, race through impossible floor labels, and reopen on HERE; preserve the real control, reduced-motion fallback, captions, and optional audio.
- **YAH-007 — Review — Chromatic Custodian.** A squeegee crosses the homepage, corrals its color into a temporary sRGB triangle, then lets the spectrum leak back into the page. The real YOU ARE HERE control remains authoritative, the caption carries the joke, and reduced-motion receives a static color-space card without sweeping or dripping motion. Idea Hatch item 92.
- **YAH-008 — Review — Bureau of Relative Position.** A surveyor crosshair measures YOU ARE HERE against itself, reports `0.0 m FROM ITSELF`, and applies a rubber-stamped `JURISDICTION CONFIRMED`. The accessible caption carries the complete joke, the real control remains authoritative, and reduced-motion receives the finished survey card without approach, rotation, or stamping animation.

- **YAH-009 — Review — Emergency Hotel Directory.** A rare press converts the homepage into a sepia 1960s hotel directory, assigns the collection room numbers, and swings in a brass key tagged `ROOM ∞` for YOU ARE HERE. Preserve navigation semantics beneath the temporary tableau, avoid flashing, and present the completed directory without movement under reduced motion. Idea Hatch item `a4a78db7-72b1-49e2-918d-b78ebf71d43e`.

### Daily archive-mining routine

- **IDEA-001 — Planned — Physics/art candidate mining.** Once a conversation archive or knowledge-base source is explicitly connected, scan it daily and suggest a small number of gallery exhibits and/or linked Compendium entries.
- **IDEA-002 — Planned — Candidate format.** Each suggestion should include the remembered source discussion, a one-paragraph interaction, a paired writing angle, expected implementation size, and why it fits COTM.
- **IDEA-003 — Review — Fluid-current maze.** Recovered as **Current** (CURRENT-001 through CURRENT-002) with its realtime maze-solving behavior, live potential/current views, conservative variable-conductivity update, and explicit convergence diagnostics.
- **IDEA-004 — Idea pool — Particle systems.** Recover both prototyped and conversational particle simulations.
- **IDEA-005 — Idea pool — Mathematical curiosities.** Recover useful math facts and the pseudoderivative discussion.
- **IDEA-006 — Idea pool — Hysteresis.** Recover the hysteresis models from the “MP”; clarify what “MP” refers to before naming the exhibit.
- **IDEA-007 — Idea pool — Signals and waves.** Recover lessons on single-sideband modulation, mixing, nonlinear crystals, and one-dimensional wave simulations.
- **IDEA-008 — Idea pool — Broader archive.** Include physics demonstrations, art projects, solved problems, visual concepts, lecture ideas, and research material rather than limiting suggestions to existing code.

### About, contact, and portfolio

- **ABOUT-001 — Planned — About Brenden.** Add a concise biography centered on “Brenden Martin, PhD in Electrical Engineering” and frame the museum as a science/art portfolio and calling card.
- **ABOUT-002 — Planned — QR handoff.** Display a high-contrast QR code that resolves to the canonical homepage so it can be scanned directly from a phone screen.
- **ABOUT-003 — Waiting — Contact channel.** Use the Google Workspace address reserved for the website after Brenden supplies the exact address and preferred public presentation.
- **ABOUT-004 — Planned — Portfolio pathways.** Guide potential employers, collaborators, and business partners from the short biography into selected exhibits, research concepts, writing, and music without turning the homepage into a conventional résumé template.

### Fortune Cookie exhibit

- **FORTUNE-001 — Testing — Core interaction.** A flat-color cartoon fortune cookie cracks into two animated halves and reveals a paper fortune.
- **FORTUNE-002 — Testing / Waiting — Fortune corpus.** Begin with an original COTM-flavored starter bank and the initial owner-submitted batch, then curate selected later suggestions into the public bank. Never publish a later suggestion automatically.
- **FORTUNE-003 — Testing — Repeat delight.** Repeated openings quickly fold the cookie shut, select a different fortune, and crack it again. Preserve room for rarer visual or textual surprises in a later pass.
- **FORTUNE-004 — Testing — Durable suggestion queue.** Accept a proposed fortune of 3–240 characters into a D1-backed pending-review table. Store the text, duplicate-prevention hash, review status, and timestamp only. A one-time promotion marker approves the owner batch that existed on 2026-08-02; the public endpoint lists approved text only, while later friend submissions remain pending and unlisted.
- **FORTUNE-005 — Testing — Workbench bank bridge.** The owner-only private workbench keeps its own review queue, but its generator also reads and deduplicates the public site's approved fortune bank through the public read-only endpoint. This repairs the data split without pointing private submissions at production.
- **FORTUNE-008 — Testing — Golden Ticket to The Outernet.** The rare Golden Ticket outcome is an active Easter-egg entrance into The Outernet and can also be forced through the mysterious Fortune Cookie password control with `STAY GOLDEN`; ordinary openings retain a rare random chance. Revealing it now breaks the surrounding page into independently glitching, shifting, shrinking, falling rectangular fragments before a dark void leaves the cookie and tappable ticket isolated. Reduced-motion visitors receive the same clear destination without the prolonged transition.

### Private Research and hypothetical devices

- **RESEARCH-001 — Planned — Device concepts page.** Add hypothetical products with cartoon mockups and a lightweight expression-of-interest interaction.
- **RESEARCH-002 — Planned — Three-choice pricing signal.** Present three attractive square choices that communicate approximate willingness to pay and general interest. Do not solicit names, emails, free-form personal details, or accounts for this survey.
- **RESEARCH-003 — Design required — Minimal event record.** A response may need concept ID, selected range, and timestamp. Seeing an IP at the network layer does not require retaining it. Prefer rate limiting, a short-lived salted one-way fingerprint, or another privacy-preserving mechanism over a stored raw IP; document retention and disclosure before launch.
- **RESEARCH-004 — Planned — Abuse detection.** Detect obvious floods and duplicate submissions without claiming that IP identity proves a unique person.
- **RESEARCH-005 — Candidate — Distro Deck.** Include the concept formerly called Distro Dice.
- **RESEARCH-006 — Candidate — Lava-pixel desk toy.** A physical lava-lamp pixel simulation with an accelerometer so it responds when shaken.
- **RESEARCH-007 — Candidate — Glitch Goo video synthesizer.** Present the visual system as a potential video-synthesis module.
- **RESEARCH-008 — Waiting — Product source pass.** Mine the connected knowledge base for additional device concepts, then ask Brenden which are suitable for public display.
- **RESEARCH-009 — Testing — Collection selector.** Private Research now uses the Gallery-style destination selector in its established blue identity. Experiments and reference collections grow as independent nested pages rather than replacing one another.
- **RESEARCH-010 — Testing — Pendulum Laboratory.** Preserve the original draggable-pendulum impulse as a full Gallery exhibit with small-angle, exact nonlinear, double, and triple modes; adjustable segment length and lowest mass; nonlinear coupled-link equations; fading phosphor paths at every mass; and a twelve-second horizontal-position history for every link. Keep the former Private Research URL as a redirect so saved links survive the move.
- **RESEARCH-011 — Waiting — Mesopyramids archive.** Reserve a project room for later reports, presentations, figures, research-notebook photographs, simulations, and key plots sourced from the project directories.
- **RESEARCH-014 — Review — Mesopyramids interactive instruments.** The Mesopyramids room now links directly to Material Phases, Current, and Square Aperture through compact Gallery-preview cards, while the source-report, figure, notebook, and simulation archive slots remain additive and reserved.
- **RESEARCH-012 — Waiting — Noncontact Respiration Monitoring archive.** Reserve a project room for later reports, presentations, figures, research-notebook photographs, simulations, and key plots sourced from the project directories.
- **RESEARCH-013 — Waiting — Electro-Optic Fabry–Pérot archive.** Reserve a project room for later reports, presentations, figures, research-notebook photographs, simulations, and key plots sourced from the project directories.

### Spectrum to RGB exhibit and color Compendium sequence

- **COLOR-001 — Testing — Physical color calculator.** Integrate the user-defined spectral power distribution against the official CIE 1931 2° standard-observer table sampled at 5 nm, then convert XYZ to D65 sRGB. Normalize exposure for display, report chromaticity, and state when gamut clipping occurs.
- **COLOR-002 — Testing — Overlayed sensitivities.** Plot x̄, ȳ, and z̄ over the editable spectrum with a live visibility toggle.
- **COLOR-003 — Testing — Multiple Lorentzian sources.** Support one through six additive Lorentzian emitters.
- **COLOR-004 — Testing — Peak gesture.** Drag a circular peak handle left/right for wavelength and up/down for amplitude, in the spirit of FL Studio Parametric EQ 2.
- **COLOR-005 — Testing — Width gesture.** Drag a square half-maximum handle to control FWHM linewidth.
- **COLOR-006 — Testing — Emission presets.** Provide intuitive approximate sodium, mercury, hydrogen, and warm-white spectral examples without presenting them as calibrated lamp measurements.
- **COLOR-007 — Testing — Purple challenge.** Contrast a single violet line with a two-line red-plus-blue/violet mixture to demonstrate why purple is non-spectral.
- **COLOR-008 — Planned — Linked writing.** Cover non-spectral and contextual colors such as pink, purple, and brown; color gamuts; why RGB displays struggle with some cyans and purples; white-light continuum generation; and optical parametric amplifiers.
- **COLOR-009 — Testing — Blackbody radiation tab.** Evaluate Planck spectral radiance from 800 K through the CODATA Planck temperature using thermal, stellar, and cosmic logarithmic temperature-control bands. Plot the complete dynamically framed UV/visible/IR curve on a linear wavelength axis in the Thermal band to preserve its iconic shape, switching to a logarithmic wavelength axis for Stellar and Cosmic scales where a linear view cannot retain both the Wien peak and visible overlap. Highlight 380–780 nm, pass that visible portion through the same CIE observer and signed sRGB pipeline, provide source presets, and expose the Wien wavelength peak alongside the live rendered color. Label the Planck temperature as a conventional quantum-gravity scale rather than a proven hard ceiling.
- **COLOR-010 — Testing — sRGB gamut explorer tab.** The third Spectrum to RGB tab centers the CIE chromaticity diagram and sRGB gamut triangle. A draggable or numeric target reports normalized linear and encoded sRGB coordinates, identifies out-of-gamut chromaticities, and compares negative-channel clipping with hue-preserving compression toward D65 white. The interface explicitly labels diagram colors as orientation aids rather than physically faithful previews.

### Manifold Golf

- **GOLF-001 — Testing — Browser geodesic putter.** The recovered UV-space Pygame prototype now has a browser-native parametric-surface renderer, synchronized flat parameter-space minimap, correct seam transformations, continuous trajectory trails, aim and power controls, camera orbit, holes, and reproducible resets.
- **GOLF-002 — Testing — Curved course family.** The first browser pass includes torus, sphere, Möbius-strip, and immersed Klein-bottle courses. Torus and sphere accept Gaussian normal-displacement terrain directly in the metric; non-orientable courses explicitly identify their orientation-flipping seams rather than pretending they have a global outward side. Real projective plane and additional surfaces remain later course candidates.
- **GOLF-003 — Testing — Manifold Pool.** Pool reuses the geodesic integrator for three through ten balls, resolves equal-mass impacts in a local metric tangent frame, provides point pockets on closed surfaces, and uses a fixed 150 Hz physics step to reduce fast-shot tunneling.
- **GOLF-004 — Testing — Browser renderer.** A dependency-light Canvas surface painter keeps the exhibit available in the existing Sites runtime, with touch/keyboard controls, a separate UV map, offscreen-safe animation cleanup, and no change to the recovered original archive.
- **GOLF-005 — Testing — Gravity interpretations.** Compare force-free geodesic motion with a uniform world-down force projected into the tangent plane. A separate normal-well mode and Pop control demonstrate that a purely normal force cannot steer a surface-constrained putt, while Möbius and Klein courses expose why no continuous global “negative normal” or universal “above” exists on a non-orientable surface.

### Gallery halls and wayfinding

- **HALL-001 — Planned — Preserve See All.** Keep the current gallery page as the complete, unfiltered **See All** index when category navigation arrives. The new layer organizes discovery without hiding, deleting, or replacing exhibits.
- **HALL-002 — Exploration — Wings or Halls taxonomy.** Group exhibits into a small set of useful themed destinations, allow an exhibit to appear in more than one destination when appropriate, and decide whether the public name is “Wings,” “Halls,” or another museum term only after the categories and visual language are clear.
- **HALL-003 — Exploration — Perspective selection scene.** Present the destinations as playful hallways in one-point perspective rather than ordinary category cards. Develop themed architectural graphics with small environmental details such as waving potted plants and framed paintings of orbitals, telescopes, and other exhibit-adjacent curiosities.
- **HALL-004 — Exploration — Living preview ensembles.** Give each destination icon or vignette a tiny self-contained interaction or physics system—such as torsion-coupled rotating rings—that idles gently and responds to hover, keyboard focus, click, or touch perturbations. Each preview should suggest the hall's character without duplicating a full exhibit.
- **HALL-005 — Technical plan — Whimsy within a budget.** Isolate and suspend preview simulations when offscreen, cap their aggregate frame cost, provide reduced-motion behavior, and make every destination fully usable by keyboard and touch so the point-and-click layer remains charming rather than obstructive.
- **HALL-006 — Review — Topic filter foundation.** The Gallery banner now includes an accessible **Topic** selector with See All plus Glitch Goo, Visualizers, Mechanics, Materials Science, Electromagnetics, Audio, Optics, Oscillators, Games of Life, and Lava Lamps. Exhibit tags deliberately overlap, preserving the complete index while establishing data for a later multi-floor Museum Wing map.

### Recommended Reading

- **READ-001 — Waiting — Source list.** Brenden will supply the Recommended Reading list spanning inspiration for Tales from the Ruliad plus movies, shows, songs, video games, and other works.
- **READ-002 — Testing — Private Research placement.** Recommended Reading is a first-class entry in Private Research, with reserved shelves for books, movies, shows, YouTube, art, and other signals. Keep it deliberately empty until the first curated list arrives.
- **READ-003 — Planned — Context, not just links.** Give each selection a brief note explaining what it influenced or why it belongs in COTM.

### Compendium backbone

- **COMP-001 — Testing — Collection selector.** The Compendium follows the Gallery-style selector while retaining its red identity. Its four top-level collections are **Logs**, **Memo Dump**, **Class Notes**, and **Tales from the Ruliad**.
- **COMP-002 — Testing — Logs preserve the original index.** The former Compendium page now lives intact under **Logs** as the destination for interactive-exhibit companion articles. Existing article URLs remain stable, and their back links return to Logs.
- **COMP-003 — Testing / Waiting — Memo Dump.** Reserve three ordered eras—**Memo Dump I**, **Memo Dump II**, and **Memo Dump III**—for hundreds of photographed pocket notes. Later intake should preserve the original scan and add dates, transcription, and tags without overwriting source images.
- **COMP-004 — Testing / Waiting — Class Notes.** Reserve a course-indexed handwritten-notes archive. Each class receives an independent scan sequence with room for annotations, while the original artistic diagrams remain visually primary.
- **COMP-005 — Done — Portable site doorway.** The bottom of the Compendium index carries a high-contrast, error-corrected QR code for the canonical public COTM URL. The code itself is also a conventional accessible link.

### Music

- **MUSIC-001 — Waiting — Spotify/profile link.** Add Brenden's artist profile when supplied.
- **MUSIC-002 — Waiting — Recording archive.** Select old unreleased work that Brenden wants to host and confirm formats, artwork, credits, and publishing rights.
- **MUSIC-003 — Planned — Interactive instruments.** Add playful musical gadgets, experimental generators, goofy web synths, and sequencers.
- **MUSIC-004 — Architecture first — Persistent playback.** Let explicitly opted-in synth/sequencer audio continue across internal navigation. Put the audio engine in a persistent top-level client shell; expect a full reload, browser autoplay policy, or tab closure to stop it.
- **MUSIC-005 — Planned — Global transport.** Provide a visible way to pause/stop background audio from every page and never start persistent sound without a user gesture.
- **MUSIC-006 — Testing — Music-room index.** The Music page now uses the Gallery's collection-selector logic in its existing orange palette. The original four-button instrument remains intact on its own **Four Small Signals** subpage.
- **MUSIC-007 — Testing — Sold As Is {No Returns}.** Use this exact curly-brace title for the unreleased-recording collection. The shelf now contains **Moog Preset Alternate 4**, **Tube Groove** under **Man Made Machine {Machine Made Man}**, and all seven numbered tracks of **Ein Kleine Sternmusic** in its own album directory. Original ZIP archives remain untouched; only explicitly selected recordings are copied into the review build.
- **MUSIC-008 — Testing — Visit-specific band mark.** On each visit to the Sold As Is collection, select one of the supplied `COTM_<variant>` marks with browser cryptographic randomness. Hold the entrance animation until the chosen image loads, omit the former text label, and center the mark at every breakpoint. Do not publish every supplied picture or recording merely because it exists in the source-assets folder.
- **MUSIC-009 — Testing — Audio-linked Glitch Goo monitor.** The shared listening room places a pixel-preserving three-channel field inside a mock CRT with reflecting wall conditions and truly simultaneous double-buffered updates. The former hard-coded diagonal sine forcing was removed after it produced permanent rainbow bands. The monitor now uses the Morph Bank's exact id/dx/dy/gradient/Laplacian operator kernel, with selectable 84×63, 112×84, or 160×120 field resolution. A live spectrogram can scroll as a trail or fill the screen with the current Fourier slice, use energy-derived three-band RGB, a vertical rainbow, or white, and expose 32–256 Fourier bins at 8–60 Hz. Independent linear preamp, frequency-proportional high-bin compensation, and nonlinear gamma controls act before spectrum color mapping. Boundary injection can be overdriven from 0–500% without subtracting the artwork contribution, while visible-overlay strength remains independent so the field equations and CRT glow can be tuned separately. The three computer controls randomize across the preserved 280-preset bank, capture the current artwork-plus-spectrum boundary, and clear boundary forcing.
- **MUSIC-010 — Testing — Per-song morph direction.** Each track specifies a morph subset and beat cadence. On first play, the browser analyzes up to two minutes of the same-origin recording for tempo and onset phase, reports confidence, and uses a conservative configured fallback if analysis fails. Preserve amplitude-to-wildness and three-band forcing as independent mappings rather than conflating them with the beat clock; allow later hand correction for syncopated or percussionless material.
- **MUSIC-011 — Testing — Track-derived art direction.** Individual song pages borrow their palette, CRT boundary image, artifact, and control styling from track/album configuration while preserving one common player and field architecture. The white-planet image is the **Ein Kleine Sternmusic** album cover; the attached purple/yellow `COTM.jpg` is its track artifact.
- **MUSIC-012 — Testing — Child of the Machine Terminal.** Reconstruct the computer portion of the original high-school poster as a responsive Music instrument without the poster lettering. The CRT now uses an exact transparent extraction of Brenden's original falling-man line art rather than a CSS redraw. The code rows wave laterally on independent phases; Space toggles a looping fall whose acceleration settles into a terminal-speed phase and whose offscreen teleport is deliberately brief. The figure begins centered at every breakpoint and randomized YAH-like displacement is followed by a smooth pull back to center. Physical and on-screen keys retain their spins, scaling, jolts, reversals, color separation, text rearrangements, and generated CRT/relay sounds. Sound begins only after a visitor gesture and reduced-motion behavior is preserved.

### The Outernet

- **EGG-001 — Exploration — The Outernet architecture.** Build a hidden network of abstract graphical puzzle pages and digital escape rooms beneath the ordinary museum. The network is named **The Outernet**; individual rooms take their visible page titles from the Easter eggs that provide entry. A first owner-review placeholder at `/the-outernet` preserves the requested **SITE OF FUTURE CONSTRUCTION** signal, homepage escape route, and a CSS-cropped field from the supplied construction photograph while the room architecture remains deliberately unfinished.
- **EGG-002 — Planned — Hidden counters.** Track how many visitors pass through secret areas, echoing the YOU ARE HERE counter, but reveal these counts only inside The Outernet.
- **EGG-003 — Planned — Warp-zone spoof.** Make one puzzle page a playful NES-era Mario warp-zone homage without copying protected game assets.
- **EGG-004 — Planned — Imperfect entry points.** Favor discoverable oddities over uniformly invisible hotspots: a missing pixel, an occasional twitch, a rare critter that skitters onto an exhibit, or a tappable/squashable anomaly that opens a hidden route. A few truly invisible triggers may still exist.
- **EGG-005 — Planned — Surreal puzzle vocabulary.** Include non-Euclidean-captcha behavior, a square peg forced into a round hole, abstract graphical riddles, and comical actions with dream logic.
- **EGG-006 — Design required — Inspector-resistant puzzles.** Client-side secrets cannot be made truly uncheatable. Keep passcodes and validation logic server-side when resistance matters, avoid shipping answers in client bundles, and design puzzles whose pleasure survives spoilers.
- **EGG-007 — Planned — Layered progression.** Let one hidden room lead to additional rooms and cross-page clues so accidental discovery can become a sustained puzzle trail.
- **EGG-008 — Safeguard — Accessibility and escape.** Surreal interactions still need a reliable way out, reduced-motion behavior, keyboard reachability where practical, and no unavoidable audio.
- **EGG-009 — Working — Interactive computer-poster entrance.** Preserve the old COTM computer poster as the visual base, make its keyboard interactive, and let key presses glitch the falling figure. A traced/vector-derived presentation may accompany but must not overwrite the source poster; the resulting Easter egg may title and enter its corresponding Outernet page.
- **EGG-010 — Review — HELLO WORLD terminal breach.** The poster keyboard and physical keyboard share a hidden command buffer. Typing `HELLO WORLD` makes the reconstructed controls, keys, console, and monitor scatter outward at increasing scale while a duplicate CRT expands from its measured on-page bounds to engulf the viewport. The original falling-man cutout remains behind, undergoes stepped horizontal displacement glitches, collapses to nothing, and then routes to `/the-outernet`; reduced-motion visitors receive the same destination through a shortened transition.

### Tales from the Ruliad

- **RULIAD-001 — Testing — Pinned Compendium collection.** Tales from the Ruliad has a prominent, stable place within the Compendium.
- **RULIAD-002 — Testing — Nested reading structure.** Seven ordered story rooms now reserve illustrated headers, manuscript bodies, and previous/next navigation without presenting unfinished prose as published text.
- **RULIAD-003 — Locked order / Waiting for material — Publication sequence.** The canonical order is **Assumptions**, **Hands**, **Lobotomy**, **Kind-Eyed Stranger**, **The Legend of Doc Pop**, **The Machine and the XASER**, and **The End of Time**. Request the selected header art and edited text one story at a time when each room enters production.
- **RULIAD-004 — Goal — Audience and momentum.** Use the collection to build an audience for a completed work and eventual hard-copy publication without presenting unfinished drafts as final.

## Inputs to request at the relevant kickoff

Do not ask for all of these at once. Request the relevant bundle immediately before its milestone begins.

- Gallery tuning screenshots, especially the Lava Lamp parameter set.
- Brenden's Particle Lenia/emergence YouTube link and manually curated must-include resource links.
- The exact Wolfram rule or enough remembered context to recover it safely.
- The website's Google Workspace contact address and preferred public wording.
- Fortune-cookie source collection.
- Recommended Reading list.
- Spotify artist/profile link, selected recordings, artwork, credits, and rights notes.
- Device-project descriptions, desired price ranges, and any existing mockups.
- Clarification of “MP” in the hysteresis-model discussion.
- Edited Tales from the Ruliad excerpts, selected story art, and chapter structure.

## Completed-work log

This is a human-readable summary of the repository history, not a substitute for Git.

### 2026-07-30

- `dbdfea0` — Converted the original Django prototype into the COTM Sites experience.
- `fc6ddb7` through `75471ed` — Added Gravity, Lava Lamp, nonlinear DEQ, Moiré, Lissajous, and Catenary exhibits; expanded fluid controls.
- `2245505` — Made YOU ARE HERE unpredictable.
- `3eb31b2`, `f1ebb9e`, `df37175` — Built and corrected Rotating Rings into the torsion-coupled, out-of-plane kinetic sculpture.
- `c7de5cd` — Added the nonlinear oscillator and its theory entry.
- `dba1f69`, `76d00a8`, `27611cf`, `0b4d36b` — Added Polarization Space, Fraunhofer diffraction, Perlin Noise, and Mirror Steering with linked writing where available.
- `3fba4d2` — Corrected homepage ornaments and removed empty gallery placeholders.
- `c8577be` through `800cf79` — Expanded YOU ARE HERE events, ambient menu choreography, event priority, extension behavior, and height-focus dance.
- `84ee001`, `d3c3896` — Expanded the oscillator spectrum/audio laboratory and stabilized the mechanical FFT with an averaged trace.
- `afce58e`, `8d83856`, `d7a1517`, `0586d90` — Added the shared DEQ preset foundry, archived/randomized morphs, dynamics controls, photo boundaries, and automated cursor.
- `f206092` — Added the durable YOU ARE HERE press counter.

### 2026-07-31

- `277a4a8` — Added six-way color cycling to DEQ morph anchors; this is the present `main` museum snapshot.
- `76580b4` — Added the frozen standalone Video Boundary Morph v1 renderer.

### 2026-08-01

- `ae5e856` — Added standalone Video Boundary Morph v2 with quantization, white bias, contrast, saturation, brightness, looping, frame hold, and morph/preset controls.
- `eaa32f3` — Made v2 encode at original source dimensions after explicit nearest-neighbor expansion from the simulation grid.
- `87b266a` — Replaced the poorly supported H.264 4:4:4 stream with standard High Profile 4:2:0 MP4 output while preserving exact source dimensions and explicit nearest-neighbor expansion.
- `329d29a` — Promoted the approved standalone renderers and the versioned project ledger into GitHub `main`.

### 2026-08-02

- `0ef7a41`, `3432e80` — Rebuilt Moiré Field as a red optical tabletop with sampled lenses and subpixel grating controls.
- `ef9ebc8` through `1849d31` — Expanded and tuned Lava Lamp controls, scaling, logarithmic mappings, and screenshot presets.
- `dd5c282` — Added the true three-dimensional Voxel Lava Volume exhibit.
- `58bc5a8` — Added the windowless Boids cloudscape and promoted it after approval.
- `dbf93e0`, `585efee` — Added Fortune Cookie, its durable review queue, and the approved initial owner batch.
- **COLOR-001 through COLOR-007 and COLOR-009** — Built the Spectrum to RGB laboratory using official CIE observer data, explicit signed sRGB conversion, editable emission spectra, and a matched Planck-law blackbody tab spanning UV through IR and temperatures through the Planck scale.

### 2026-08-03

- **DEQ-006** — Deployed the removal of the shared preset bank's hidden 256-row ceiling. Production verification collected all 280 rows across two ordered pages with no duplicate IDs, without altering morph dynamics or Curated anchors.
- **DEQ-007** — Added a reproducible local analysis workspace and frozen complete-bank snapshot. The first symmetry-aware pass reduces 313 named anchors to 283 exact unique states, finds a 263-state main body plus a 20-state high-coupling/high-decay outer family, and exports the data needed for deeper behavioral analysis.
- **DEQ-009** — Fitted the 263-state main family with a smoothed seven-dimensional principal curve retaining 91% of aligned variance, sampled it uniformly by arc length, and built the independent DEQ Atlas exhibit with two repeatable numeric coordinates and deterministic restarts.
- **DEQ-009 controls** — Replaced the difficult rotary dials with full-range coarse sliders and high-resolution `±0.02` fine sliders for both route position and deterministic chaos while preserving exact numeric coordinates.
- **HOME-001** — Replaced the long homepage cabinet description with the concise museum identity line.
- **GOLF-001 through GOLF-004** — Recovered the Manifold Golf concept from the indexed local conversation catalogue and recorded the browser geodesic-putter, curved-course, and collision-aware pool directions without claiming the original prototype source has been recovered.
- **GOLF-001 through GOLF-005 browser pass** — Recovered the original ten-file Pygame/OpenGL prototype archive and built the first browser exhibit with four course surfaces, Golf and Pool, metric collisions, UV trails, Gaussian terrain, and explicit world-versus-normal gravity experiments.

### 2026-08-04

- **COLOR-010** — Added a draggable CIE 1931 xy diagram, the sRGB primary triangle, numeric chromaticity entry, linear/encoded RGB readouts, and an explicit comparison between channel clipping and D65-directed gamut compression.

### 2026-08-05

- **MUSIC-006 through MUSIC-011** — Reorganized Music into collection rooms, preserved Four Small Signals on its own route, opened **Sold As Is {No Returns}**, and added **Moog Preset Alternate 4** with its calculator cover, randomized COTM collection mark, native player, and first audio-reactive cover-bound CRT field.

### 2026-08-06

- **COMP-001 through COMP-004, RULIAD-001 through RULIAD-003, RESEARCH-009 through RESEARCH-010, READ-002, and FORTUNE-005** — Built the remaining Compendium and Private Research navigation backbones in the private workbench, reserved the note and reading archives, added all seven Ruliad story rooms in canonical order, replaced the research pendulum placeholder with a nonlinear multi-link laboratory, and bridged the workbench Fortune Cookie to the public approved bank.
- **RESEARCH-010 through RESEARCH-013** — Moved Pendulum Laboratory into Gallery as exhibit 20 while preserving its former URL, and replaced its Private Research card with project-archive rooms for Mesopyramids, Noncontact Respiration Monitoring, and Electro-Optic Fabry–Pérot.
- **RULIAD-004 — First illustration pass.** Installed the supplied art for *Hands*, *Kind-Eyed Stranger*, *The Legend of Doc Pop*, and two interior views for *The Machine and the XASER*. Keep the animated orbital geometry and each story's color field visible around every illustration as a permanent part of the room design. Added a one-line story signal to every room, distilled from the indexed Ruliad conversations rather than substituting new manuscript prose.
- **RULIAD-005 — Inside The Machine field archive.** Filed the second five-photo batch as further views for *The Machine and the XASER*: the glowing Brownie camera, two instrument-room views, the signal tower, and the equipment haul. The original interior pair remains the story's hero treatment; the new photographs live in a spacious contact sheet with a second animated orbital field so neither the pictures nor the permanent geometric language are crowded out.
- **RULIAD-006 — Image intake vault.** Added a human-readable asset catalog and preserved five further Ruliad-associated images under stable descriptive names: the bean-shaped yin–yang, two magenta instrument-room views, the dashboard terrarium, and the red-lit field kit. Mnemosyne did not establish an exact tale assignment for this batch, so the assets remain intentionally unassigned rather than turning visual resemblance into canon.
- **RULIAD-007 — Image intake vault, batch two.** Preserved five more Ruliad-associated photographs: the passenger-seat synthesizers and projection dome, car-seat cable looms, mushroom still life, workbench field note, and vintage vacuum-tube layout. All remain unassigned and ready for later canonical placement.
- **RULIAD-008 — Image intake vault, batch three.** Preserved another five Ruliad-associated photographs: the shirt-pocket drafting kit, red keyboard room, pond pump structure, grotto pool, and grotto waterfall. All remain unassigned and ready for later canonical placement.
- **RULIAD-009 — Image intake vault, batch four.** Preserved the laboratory hallway, vintage physics-of-sound chart, retro media room, XR-1200 mixing console, and doorway view of the keyboard room. All remain unassigned and ready for later canonical placement.
- **RULIAD-010 — Image intake vault, batch five.** Preserved the antique-store phonograph, mammatus-cloud field, and woodland yurts. The other two submissions were checksum-identical repeats of the existing grotto-pool and grotto-waterfall assets, so the catalog records their recurrence without storing duplicate files.
- **RULIAD-011 — Image intake vault, batch six.** Preserved all five received images as two coherent technical clusters: three optical-breadboard component arrangements and two vintage circuit-board closeups. All remain unassigned and ready for later canonical placement.
- **RULIAD-012 — Image intake vault, batch seven.** Preserved a five-image texture study for the Ruliad canon: moss-covered bones, a wall of weathered skulls, worn canvas shoes, a second illuminated bone arrangement, and lichen-covered stone. The cluster remains unassigned and ready for later canonical placement.
- **RULIAD-013 — Image intake vault, batch eight.** Preserved the five supplied photographs of Brenden's physical fortune-slip archive under stable descriptive names. The source photographs remain unassigned Ruliad texture material while their readable text is independently available to the Fortune Cookie exhibit.
- **FORTUNE-006 — Physical fortune archive import.** Transcribed and approved all 27 readable fortunes from the five supplied photographs, found no exact duplicates in the 97-entry public approved bank, and added the new lines to the private workbench's versioned local bank. The generator and its read-only bank endpoint both include the collection without altering either site's pending-review queue.
- **RULIAD-014 — Image intake vault, batch nine.** Preserved three further photographs of the physical fortune archive, the toy-rat piano study, and the narrow machine-shop interior. The latter two remain unassigned rather than being mistaken for the specifically identified TV-cabinet Machine.
- **FORTUNE-007 — Physical fortune archive, second import.** Transcribed and approved 16 further readable slips. None exactly duplicates the 97-entry public approved bank or the first 27-line photographed collection; both similar email fortunes remain because they are distinct physical texts.
- **RULIAD-015 — The belly of The Machine.** Added five explicitly identified views to *The Machine and the XASER* field archive: the assembled CRT-and-instrument cabinet, suspended cable canopy, low console view, blue adjoining room, and violet mixing-desk portrait.
- **RULIAD-016 — Lobotomy preview mark.** Installed the plainer white rat drawing on black as the main *Lobotomy* preview and hero image. Preserved the colored, crossed-bones variation as a labeled alternate without using it as the primary mark.
- **RULIAD-017 — Assumptions knot and yarn archive.** Installed the four knitted knots on the white sketch-covered field as the unmistakable main *Assumptions* image. Built a seventeen-plate supporting collection led by the colorful yarn illustration and spanning physical knot studies, bread, works in progress, yarn orbits, soft-sculpture habitats, and two deliberately shared views of The Machine where its cables and operator become part of the same topology. Checksum-identical Machine photographs were referenced in place rather than copied again.
- **RULIAD-018 — Assumptions drawing studies.** Mixed four further ink and pencil works into the conceptual middle of the *Assumptions* archive: the flowering continuous line, pocket notebook of multilingual knot and geometry notes, dense imagined cosmos, and vertical hexagonal hive study. The room now moves through twenty-one supporting plates rather than treating the new work as a detached batch.
- **RULIAD-019 — Assumptions priority-image framing.** Locked the multi-knot hero and colorful yarn illustration to their measured native aspect ratios and contain presentation so neither composition is cropped by the general-purpose story frames.

- **RULIAD-020 — Story-specific image placement.** Added two rat photographs to a supporting *Lobotomy* archive while preserving the plain rat mark as its primary preview; introduced the overgrown technological drawing as the first *End of Time* hero; paired the new vessel sketch with *Hands*; and assigned the already-preserved mushroom tableau to *Assumptions* without duplicating its checksum-identical source file.

- **RULIAD-021 — Mushroom fields, piano rats, and terminal signals.** Expanded *Assumptions* with natural mushrooms, a crocheted field mushroom, and a terrarium drawing; assigned the already-preserved piano-rat photograph to *Lobotomy* without duplicating its source; and paired *The End of Time* drawing with a dense computational CRT pattern.

- **RULIAD-022 — XASER laboratory, mushroom studies, and Hands framing.** Added the vintage laboratory instrument to *The Machine and the XASER*; expanded *The Fabric of Spacetime* with two mushroom drawings and the previously preserved dashboard terrarium; assigned the previously preserved passenger-seat apparatus to *Hands*; and locked every Hands image to its measured native aspect ratio with contain presentation.

- **RULIAD-023 — Universal story-plate framing.** Standardized every Tales room on the outlined, story-color plate language established by *The Fabric of Spacetime*. Hero and archive images now retain their measured native aspect ratios, use contain presentation, participate in normal document flow, and never rely on cropped cover frames, decorative overlap, or translated contact-sheet placement.

- **RULIAD-024 — Hands, Kind-Eyed, and XASER field studies.** Added two complementary notebook views to a new supporting *Hands* archive, gave *Kind-Eyed Stranger* an outlined portrait-study plate, and expanded *The Machine and the XASER* with a marker architecture study and the already-preserved mammatus-cloud photograph. The duplicate cloud submission reuses its checksum-identical vault asset, and all new plates inherit the universal native-ratio, no-crop presentation.

- **RULIAD-025 — Machine hero and terminal plate reassignment.** Promoted the magenta CRT-and-starfield room to the sole main photograph for *The Machine and the XASER*, retained its former hero pair as uncropped supporting plates, and moved the former Machine plate six into a new *The End of Time* collection titled *Signals at the End*.

- **RULIAD-026 — Machine and XASER field-study expansion.** Added five uncropped supporting plates to *The Machine and the XASER*: two speculative drawings, two refinery landscapes, and a mist-filled mountain valley. The existing magenta CRT-room hero remains unchanged, and every new plate preserves its measured native aspect ratio.

- **RULIAD-027 — Final labeled image flood.** Recovered the 29 attachments that arrived after private-workbench version 24: 27 explicitly labeled for *The Machine and the XASER*, one for *Kind-Eyed Stranger*, and one for *Lobotomy*. After checksum reconciliation, the site gains 28 distinct story plates backed by 23 new files and five canonical vault reuses; a twice-submitted resonator-curtain photograph appears only once. Every addition inherits the universal story-color outline, measured native ratio, contain framing, and no-overlap layout.

- **DEQ-010 — The Luckfield.** Added a separate recursive-field gallery instrument that periodically replaces its DEQ boundary conditions with the evolving field itself. Its default Luckfield controller accepts captures only after brightness and a combined entropy, chromatic variance, and five-scale structural-persistence score pass adjustable gates, then applies a probability check. Five user-supplied positive fields are preserved as regression fixtures and score from 0.914 to 1.000. Periodic and prominent Manual modes, independent boundary hold/reset/capture controls, controllable transition wildness, and old-boundary glitch blocks with color and zoom mutation remain available. The equation traverses the complete anchor bank across all six RGB permutations by default, while the 160×90 display keeps every visible cell square. The traversal bank is now materialized as a deduplicated union of factory, archived curated, and every paginated shared/subsequent anchor before the six channel permutations are derived; the live interface reports the exact armed route count. Optional crosshair sonification loops the center row and column as stereo audio granules. A selectable Full Raster variation reads every pixel through complementary horizontal and vertical serpentine scans: average red raises playback energy, local blue applies high-frequency damping, and local green introduces micro-granular holds and jitter. A third Fourier Field interpreter treats each column as a spectrogram frame, maps vertical position to frequency, hue to complex phase, and brightness directly to coefficient amplitude, then inverse-transforms and overlap-adds 160 windows; the right channel mirrors phase orientation for stereo width. A fourth Live Sweep interpreter streams every evolving field frame into a continuously running 90-oscillator AudioWorklet bank: x is time with an adjustable 0.1 ms–1 s step per pixel, y is logarithmically mapped from 20 Hz at the bottom to 10 kHz at the top, brightness is amplitude, and hue is phase. Its tuning can remain continuously unquantized or snap every bin across octaves to C major pentatonic, C blues, or C melodic minor. Its visible vertical bar is driven by the audio processor's actual playhead. The three buffered modes replace their material at an adjustable frame cadence. A field-only fullscreen control preserves the exact 16:9 square-cell surface and keeps its exit control inside the expanded stage.

- **DEQ-011 — Gibberish Generator.** Added a separate character-dialogue gallery instrument grounded in the established Ruliad alignment basis: Strength is red, Luck is green, and Intelligence is blue. Typed speech enters a 160×72 square-cell nonlinear field a syllabic chunk at a time as a persistent text-shaped boundary condition. The same RGB identity mixes a Luck saw-to-triangle voice with wandering pitch, a Strength PWM pulse voice with percussive consonant noise, and a clipped Intelligence sine voice with a stable second formant. Speech speed, center pitch, pitch variance, portamento, and character color remain directly adjustable. The visual field runs the exact five-template coupled DEQ update against the deduplicated union of all 26 preserved curated anchors and every paginated subsequent shared anchor, with load progress and selectable reseeding. A hand-built bitmap alphabet keeps every glyph aligned to the square-cell lattice without font raster smoothing and can switch between 1× 5×7 cells and 2× 10×14 cells. Each glyph is converted into an RGB spatial weight field that modulates the DEQ identity, derivative, gradient, and weighted-Laplacian terms like a photo boundary; no static glyph color is injected into the output field.

### 2026-08-11

- **MUSIC-007 through MUSIC-012** — Refactored Sold As Is into a shared configurable listening-room template, added Tube Groove and the complete seven-track Ein Kleine Sternmusic directory, added automatic tempo/onset analysis and live spectrogram boundaries, repaired the randomized logo entrance, and built the interactive Child of the Machine poster terminal. The first full-quality checkpoint was deployed owner-only to the private workbench as Sites version 41; the public site remains unchanged. Subsequent MUSIC-009 tuning adds stable seek controls, reflecting walls, full-bank randomization, boundary capture/clear, and configurable spectrum resolution/rate for private review.
- **MUSIC-012 / FORTUNE-008 / EGG-001** — Centered the original falling figure at desktop and mobile breakpoints, made Space toggle a faster accelerating fall with a near-instant offscreen reset, and made random key displacement relax back to center. The forced or rare Golden Ticket now triggers a blockwise psychedelic page collapse and links to the first **The Outernet** construction placeholder. This checkpoint remains private-workbench-only pending hands-on review.

### 2026-08-25

- **HARMONY-001 — Harmonic Topography V24.** Added the modular seeded composition engine, fixed four-beat Web Audio scheduler with 25 ms wakeups and 140 ms look-ahead, complete v24 section graph and modal palettes, motif-memory lead and breakout gestures, compact chord voice leading, two modal harmony voices, reference rhythm section, editable transition and palette weights, chord/tension controls, mixer mute/solo/gain strips, serialized machine import/export, live candidate-weight diagnostics, and a draggable continuous tension terrain with an AudioContext-phased traveler. Added focused regression tests for exact cycles, deterministic replay, cycle-completion routing, motif recurrence, route weights, and modal palettes. This checkpoint is private-workbench-only pending hands-on review.
- **HARMONY-002 / RHYTHM-001 — Mutable harmony and Phase Barrel.** Expanded Harmonic Topography with complete theory-tamed graph mutation, section lengths from two through ten bars, legal repeated chords, live relayout, six progression vocabularies, and the expanded chord/scale data required by them while keeping V24 as a clean reference reset. Added Phase Barrel as a separate Tempest-like vector sculpture whose ring phases are integrated rather than recomputed, so live frequency changes remain continuous; Gaussian hit memory drives five selectable visual couplings while radius-scaled Web Audio chirps, amplitude heights, acceleration, trails, presets, per-ring controls, and full randomization make the sculpture playable. Both remain private-workbench-only pending hands-on review.

## Decision log

- **2026-07-30:** “Rotating Rings” means nested concentric rings connected axially by torsion springs, rotating out of their starting plane.
- **2026-07-30:** Polarization prototypes belong in one unified gallery entry.
- **2026-07-30:** The Gallery grows by adding pages; existing exhibits are not casualties of expansion.
- **2026-07-30:** The homepage YOU ARE HERE button is a recursive-home joke and a host for a large non-cyclic gag library.
- **2026-07-30:** TWISTER is a work repository and permanently off-limits.
- **2026-07-31:** The current DEQ Curated preset bank is protected; All may continue to grow.
- **2026-07-31:** Standalone Video Morph v1 remains unchanged; experimental media-processing features continue in v2 or later versions.
- **2026-08-01:** Low-resolution simulation detail is an aesthetic feature. Upscaling must use nearest-neighbor pixel selection at the original media dimensions, never smoothing interpolation.
- **2026-08-01:** Default delivery favors a widely playable H.264 High Profile 4:2:0 MP4. The renderer, not the media player, still performs the only spatial enlargement by explicit nearest-neighbor pixel selection.
- **2026-08-02:** Preserve gallery momentum through Spectrum to RGB, references, tuning, and homepage delight. Move About/portfolio into the later major-expansion milestone, where it becomes the first architectural priority.
- **2026-08-03:** When themed gallery navigation is introduced, retain the current gallery index as **See All**. Treat “Wings” versus “Halls” as an open naming decision and make the selection screen a one-point-perspective, physics-reactive museum scene rather than a static category menu.
- **2026-08-05:** The unreleased-music collection's canonical display title is **Sold As Is {No Returns}**. Curly braces are intentional typography and must not be normalized to parentheses.
- **2026-08-06:** **Recommended Reading** belongs in Private Research, not the Compendium.
- **2026-08-06:** The Compendium's former article index is preserved as **Logs**. The top level now organizes Logs, Memo Dump, Class Notes, and Tales from the Ruliad.
- **2026-08-06:** The canonical Ruliad order places **Kind-Eyed Stranger** before **The Legend of Doc Pop**, as confirmed after comparing the current note with the older Ruliad outline.
- **2026-08-06:** Private-workbench D1 remains isolated from production. Its Fortune Cookie may read the public approved bank, but private test submissions continue to stay in the private queue.
- **2026-08-06:** Pendulum Laboratory belongs in Gallery. Private Research is the home for Brenden's real research archives, beginning with Mesopyramids, Noncontact Respiration Monitoring, and Electro-Optic Fabry–Pérot; their current rooms remain intentionally skeletal until the named source directories are supplied.
- **2026-08-06:** Ruliad illustrations layer into the existing rainbow story rooms; they do not replace the geometric fields or animated orbital language.
- **2026-08-08:** The Luckfield keeps a square-pixel 16:9 simulation surface even inside stretched viewports so recursive feedback does not acquire display-induced directional asymmetry.
- **2026-08-17:** This checkpoint is the first public structure-complete COTM build: the core Compendium, Gallery, Music, Private Research, Tales from the Ruliad, and Outernet entrance architecture has been assembled and approved through the owner-only workbench. Preserve it as the `v1.0.0-structure-complete` GitHub milestone.
