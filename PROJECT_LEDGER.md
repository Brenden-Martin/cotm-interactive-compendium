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

The next Site version contains eighteen gallery exhibits:

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
- **FORTUNE-001 and FORTUNE-004 — Testing:** Fortune Cookie provides a flat-color cracking animation, a curated starter bank, and a durable suggestion box. Brenden's initial owner-submitted batch is approved; later visitor submissions remain pending until a deliberate review pass.
- **COLOR-001 through COLOR-007 and COLOR-009 — Testing:** Spectrum to RGB uses official CIE 1931 2° observer data sampled at 5 nm, live signed D65 sRGB conversion, multiple Lorentzian emitters, direct peak/linewidth gestures, emission presets, gamut warnings, the purple challenge, and a Planck-law blackbody laboratory with a full UV-to-IR spectrum, an iconic linear wavelength view for Thermal temperatures, logarithmic Stellar/Cosmic views, tiered controls reaching the Planck scale, source presets, and a Wien-peak readout.

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
2. Build and test Spectrum to RGB in **COLOR-001** through **COLOR-007** and **COLOR-009**.
3. Publish its linked color-perception Compendium sequence under **COLOR-008** after the interaction is trustworthy.

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
2. Establish Recommended Reading and Tales from the Ruliad structures in **READ-001** and **RULIAD-001** through **RULIAD-003**.
3. Build persistent Music playback before adding instruments and recordings.
4. Add Private Research interest signals only after the privacy and retention design is explicit.
5. Open the hidden puzzle labyrinth gradually, beginning with one discoverable anomaly and one complete room.

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

### YOU ARE HERE and homepage behavior

- **YAH-001 — Planned — Daily gag proposals.** Generate a few candidates daily, sometimes informed by the connected conversation archive and sometimes by slapstick, absurdity, or fitting pop-culture references. The routine proposes; Brenden chooses what ships.
- **YAH-002 — Next — Probability rebalance.** Make full visual/physical effects more common, text-or-sound-only outcomes less common, and the rarest events less vanishingly rare.
- **YAH-003 — Exploration — Novelty-weighted selection.** As the gag library grows, prefer a recent-history/novelty system over rigid rarity tiers so repeat clicks remain surprising without forcing users through a fixed cycle.
- **YAH-004 — Safeguard — Interaction authority.** A direct button press always takes control from ambient menu animation until the selected gag finishes or intentionally navigates away.

### Daily archive-mining routine

- **IDEA-001 — Planned — Physics/art candidate mining.** Once a conversation archive or knowledge-base source is explicitly connected, scan it daily and suggest a small number of gallery exhibits and/or linked Compendium entries.
- **IDEA-002 — Planned — Candidate format.** Each suggestion should include the remembered source discussion, a one-paragraph interaction, a paired writing angle, expected implementation size, and why it fits COTM.
- **IDEA-003 — Idea pool — Fluid-current maze.** Recover the solver that lets users doodle boundary conditions, watch the solve, and inspect the planar vector current-density field, including the memorable realtime maze-solving behavior.
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

### Private Research and hypothetical devices

- **RESEARCH-001 — Planned — Device concepts page.** Add hypothetical products with cartoon mockups and a lightweight expression-of-interest interaction.
- **RESEARCH-002 — Planned — Three-choice pricing signal.** Present three attractive square choices that communicate approximate willingness to pay and general interest. Do not solicit names, emails, free-form personal details, or accounts for this survey.
- **RESEARCH-003 — Design required — Minimal event record.** A response may need concept ID, selected range, and timestamp. Seeing an IP at the network layer does not require retaining it. Prefer rate limiting, a short-lived salted one-way fingerprint, or another privacy-preserving mechanism over a stored raw IP; document retention and disclosure before launch.
- **RESEARCH-004 — Planned — Abuse detection.** Detect obvious floods and duplicate submissions without claiming that IP identity proves a unique person.
- **RESEARCH-005 — Candidate — Distro Deck.** Include the concept formerly called Distro Dice.
- **RESEARCH-006 — Candidate — Lava-pixel desk toy.** A physical lava-lamp pixel simulation with an accelerometer so it responds when shaken.
- **RESEARCH-007 — Candidate — Glitch Goo video synthesizer.** Present the visual system as a potential video-synthesis module.
- **RESEARCH-008 — Waiting — Product source pass.** Mine the connected knowledge base for additional device concepts, then ask Brenden which are suitable for public display.

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

### Recommended Reading

- **READ-001 — Waiting — Source list.** Brenden will supply the Recommended Reading list spanning inspiration for Tales from the Ruliad plus movies, shows, songs, video games, and other works.
- **READ-002 — Exploration — Prominent placement.** Treat it as a pinned or otherwise persistent Compendium entry. Decide whether its best home is a side rail, footer feature, or pinned index card after the Compendium layout has more content.
- **READ-003 — Planned — Context, not just links.** Give each selection a brief note explaining what it influenced or why it belongs in COTM.

### Music

- **MUSIC-001 — Waiting — Spotify/profile link.** Add Brenden's artist profile when supplied.
- **MUSIC-002 — Waiting — Recording archive.** Select old unreleased work that Brenden wants to host and confirm formats, artwork, credits, and publishing rights.
- **MUSIC-003 — Planned — Interactive instruments.** Add playful musical gadgets, experimental generators, goofy web synths, and sequencers.
- **MUSIC-004 — Architecture first — Persistent playback.** Let explicitly opted-in synth/sequencer audio continue across internal navigation. Put the audio engine in a persistent top-level client shell; expect a full reload, browser autoplay policy, or tab closure to stop it.
- **MUSIC-005 — Planned — Global transport.** Provide a visible way to pause/stop background audio from every page and never start persistent sound without a user gesture.

### Easter-egg labyrinth

- **EGG-001 — Exploration — Labyrinth architecture.** Build a hidden network of abstract graphical puzzle pages and digital escape rooms beneath the ordinary museum.
- **EGG-002 — Planned — Hidden counters.** Track how many visitors pass through secret areas, echoing the YOU ARE HERE counter, but reveal these counts only inside the labyrinth.
- **EGG-003 — Planned — Warp-zone spoof.** Make one puzzle page a playful NES-era Mario warp-zone homage without copying protected game assets.
- **EGG-004 — Planned — Imperfect entry points.** Favor discoverable oddities over uniformly invisible hotspots: a missing pixel, an occasional twitch, a rare critter that skitters onto an exhibit, or a tappable/squashable anomaly that opens a hidden route. A few truly invisible triggers may still exist.
- **EGG-005 — Planned — Surreal puzzle vocabulary.** Include non-Euclidean-captcha behavior, a square peg forced into a round hole, abstract graphical riddles, and comical actions with dream logic.
- **EGG-006 — Design required — Inspector-resistant puzzles.** Client-side secrets cannot be made truly uncheatable. Keep passcodes and validation logic server-side when resistance matters, avoid shipping answers in client bundles, and design puzzles whose pleasure survives spoilers.
- **EGG-007 — Planned — Layered progression.** Let one hidden room lead to additional rooms and cross-page clues so accidental discovery can become a sustained puzzle trail.
- **EGG-008 — Safeguard — Accessibility and escape.** Surreal interactions still need a reliable way out, reduced-motion behavior, keyboard reachability where practical, and no unavoidable audio.

### Tales from the Ruliad

- **RULIAD-001 — Planned — Pinned Compendium collection.** Give Tales from the Ruliad a prominent, stable place within the Compendium.
- **RULIAD-002 — Planned — Nested reading structure.** Host stories and chapters as nested subpages with comfortable long-form reading, rather than sending friends undifferentiated text blocks.
- **RULIAD-003 — Waiting — Publication sequence.** Brenden will choose edited excerpts and their order as they become polished enough to share.
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
- Edited Tales from the Ruliad excerpts, story order, and chapter structure.

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
