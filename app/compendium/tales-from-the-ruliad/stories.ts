type RuliadIllustration = {
  src: string;
  alt: string;
  fit?: "contain" | "cover";
  ratio?: string;
};

type RuliadStory = {
  slug: string;
  title: string;
  pitch: string;
  art?: readonly RuliadIllustration[];
  logs?: readonly {
    id: string;
    title: string;
    body: readonly string[];
  }[];
  archive?: {
    title: string;
    note: string;
    images: readonly RuliadIllustration[];
  };
};

export const ruliadStories: readonly RuliadStory[] = [
  {
    slug: "assumptions",
    title: "Assumptions",
    art: [{ src: "/ruliad/assumptions.jpg", alt: "Four knitted knot forms arranged on a white page filled with hand-drawn knot studies", fit: "contain", ratio: "1280 / 989" }],
    archive: {
      title: "The Fabric of Spacetime",
      note: "A tactile field notebook of drawn, baked, knitted, crocheted, and inhabited loops: ideas tested by hand until their crossings become objects, organisms, and parts of The Machine.",
      images: [
        { src: "/ruliad/assumptions-yarn-illustration.jpg", alt: "A vivid marker illustration of bundled yarn casting an abstract orange shadow", fit: "contain", ratio: "1280 / 742" },
        { src: "/ruliad/assumptions-white-knot-object.jpg", alt: "A white interwoven knot object resting against ornate woven fabric", fit: "contain", ratio: "1280 / 1280" },
        { src: "/ruliad/assumptions-bread-knot.jpg", alt: "A baked bread knot served in a round earthenware bowl", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/assumptions-painted-knot-study.jpg", alt: "A hand holding a painted study of a golden trefoil knot and its black shadow form", fit: "contain", ratio: "960 / 1280" },
        { src: "/ruliad/assumptions-knot-transformation.jpg", alt: "A hand-drawn sequence attempting to transform a knot into a loop, captioned with a knot pun", fit: "contain", ratio: "1280 / 997" },
        { src: "/ruliad/assumptions-flowering-line-study.jpg", alt: "An ink drawing in which a continuous curling line flowers into leaves, eyes, and organic knots", fit: "contain", ratio: "872 / 1280" },
        { src: "/ruliad/assumptions-pocket-knot-notes.jpg", alt: "A hand-held notebook page combining knot studies, infinity marks, geometry, Korean writing, and a German sentence", fit: "contain", ratio: "960 / 1280" },
        { src: "/ruliad/assumptions-dense-ink-cosmos.jpg", alt: "A framed black-and-white drawing densely filled with geometric cells, flowing forms, and miniature imagined systems", fit: "contain", ratio: "960 / 1280" },
        { src: "/ruliad/assumptions-geometric-hive-study.jpg", alt: "A sketchbook study of nested hexagons, a central doorway-like form, and a small suspended chamber", fit: "contain", ratio: "960 / 1280" },
        { src: "/ruliad/assumptions-rainbow-knot-in-progress.jpg", alt: "A rainbow knitted knot still attached to its wooden knitting spool on a soft gray surface", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/assumptions-handheld-rainbow-knot.jpg", alt: "A hand holding a rainbow knitted infinity-shaped knot and wooden spool", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/inside-the-machine-09.jpg", alt: "Braided yarn, coiled leads, and suspended cables crossing the blue-green ceiling of The Machine", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/assumptions-yarn-mushroom-workbench.jpg", alt: "Crocheted mushrooms, yarn spheres, terrariums, and drawing tools gathered on a colorful workbench", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/assumptions-field-mushrooms.jpg", alt: "A loose constellation of white mushrooms rising from green grass", fit: "contain", ratio: "1280 / 964" },
        { src: "/ruliad/assumptions-crocheted-mushroom-field.jpg", alt: "A striped crocheted mushroom planted upright in a field of grass", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/assumptions-mushroom-terrarium-sketch.jpg", alt: "A colored-pencil study of mushrooms and moss enclosed inside a round glass terrarium", fit: "contain", ratio: "960 / 1280" },
        { src: "/ruliad/assumptions-chanterelle-study.jpg", alt: "A colored-pencil study of a chanterelle-like mushroom on a spiral-bound sketchbook page", fit: "contain", ratio: "960 / 1280" },
        { src: "/ruliad/assumptions-mushroom-vessel-study.jpg", alt: "A colored-pencil study of mushrooms sprouting from a translucent rounded vessel", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/vault/dashboard-terrarium.jpg", alt: "A glass terrarium resting on a dashboard before a sunlit wooded clearing", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/assumptions-yarn-orbits-01.jpg", alt: "Orange and green yarn spheres entangled in soft pink strands on a striped field", fit: "contain", ratio: "1280 / 1280" },
        { src: "/ruliad/assumptions-yarn-orbits-02.jpg", alt: "Close view of green and orange crocheted spheres connected by pale pink loops", fit: "contain", ratio: "1280 / 1280" },
        { src: "/ruliad/assumptions-yarn-orbits-03.jpg", alt: "Two crocheted spheres and their loose connecting strands arranged on black and white stripes", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/assumptions-yarn-terrariums.jpg", alt: "Crocheted vessels and mushrooms growing from glass terrariums and moss", fit: "contain", ratio: "1280 / 928" },
        { src: "/ruliad/vault/mushroom-still-life.jpg", alt: "Handmade mushroom tableaux, a notebook, and small drawings arranged across green cloth", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/assumptions-soft-sculpture-console-01.jpg", alt: "A family of fluorescent crocheted vessels and forms arranged across a mixing console", fit: "contain", ratio: "1280 / 934" },
        { src: "/ruliad/assumptions-soft-sculpture-table.jpg", alt: "A crowded tabletop habitat of crocheted mushrooms, pods, and glass enclosures", fit: "contain", ratio: "1280 / 1037" },
        { src: "/ruliad/assumptions-soft-sculpture-console-02.jpg", alt: "A green crocheted vessel spreading long soft tendrils across a mixing console", fit: "contain", ratio: "1280 / 954" },
        { src: "/ruliad/inside-the-machine-12.jpg", alt: "A yarn-crowned figure working at The Machine beneath a canopy of suspended strands and notes", fit: "contain", ratio: "988 / 1280" },
      ],
    },
    pitch: "A universe declares its physical and narrative rules—and quietly admits that explanation is already storytelling.",
  },
  {
    slug: "hands",
    title: "Hands",
    pitch: "An astronaut loses sensation, sight of himself, and the hands that once held his life together.",
    art: [{ src: "/ruliad/hands.jpg", alt: "An astronaut held above the enormous black silhouette of a hand", fit: "contain", ratio: "943 / 1280" }],
    archive: {
      title: "Studies of Hands and Their Machines",
      note: "Field drawings and transported instruments gather around the astronaut: hands as tools, signals, mechanisms, memory, and the fragile means by which a life holds itself together.",
      images: [
        { src: "/ruliad/hands-jar-sketch.jpg", alt: "A purple-lit sketchbook drawing of a vast vessel, drifting marks, and a suspended hand-like form", fit: "contain", ratio: "960 / 1280" },
        { src: "/ruliad/vault/passenger-seat-synth-dome.jpg", alt: "Synthesizers, a projection dome, and a small plant carefully packed into a car's passenger seat", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/hands-field-notebook-spread.jpg", alt: "An open field notebook held outdoors, pairing a small machine sketch with a richly colored mechanical figure study", fit: "contain", ratio: "960 / 1280" },
        { src: "/ruliad/hands-mechanical-figure-study.jpg", alt: "Close field-notebook study of an articulated mechanical figure surrounded by gauges, vessels, cables, and detached hands", fit: "contain", ratio: "960 / 1280" },
      ],
    },
  },
  {
    slug: "lobotomy",
    title: "Lobotomy",
    pitch: "A man deletes himself piece by piece, preserving only the scraps he hopes deserve to survive him.",
    art: [{ src: "/ruliad/lobotomy.jpg", alt: "A plain white hand-drawn rat mark on a black field", fit: "contain", ratio: "574 / 1280" }],
    archive: {
      title: "Rat Studies",
      note: "Two small lives curl into shelter and explore a hanging garden: domestic field studies for the story's gentler, stranger anatomy.",
      images: [
        { src: "/ruliad/lobotomy-rats-resting.jpg", alt: "Two rats curled together inside folds of dark plaid fabric", fit: "contain", ratio: "1280 / 739" },
        { src: "/ruliad/lobotomy-rats-moss-platform.jpg", alt: "Two rats exploring a moss-covered hanging platform beside a clear exercise wheel", fit: "contain", ratio: "960 / 1280" },
        { src: "/ruliad/vault/piano-rat-studies.jpg", alt: "Three toy rats gathered across the illustrated keys of an upright piano", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/lobotomy-handheld-rat.jpg", alt: "A black-and-white rat resting calmly in an open hand", fit: "contain", ratio: "960 / 1280" },
      ],
    },
  },
  {
    slug: "kind-eyed-stranger",
    title: "Kind-Eyed Stranger",
    pitch: "A friend to everyone and a stranger to himself, guided by a few fortunes and the choice to be kind.",
    art: [{ src: "/ruliad/kind-eyed-stranger.jpg", alt: "A pencil portrait surrounded by floating eyes, loops, and symbols", fit: "contain", ratio: "811 / 1280" }],
    archive: {
      title: "Faces Seen and Remembered",
      note: "A second portrait holds a warmer register of the stranger's gaze, with another presence lingering faintly behind it.",
      images: [
        { src: "/ruliad/kind-eyed-portrait-study.jpg", alt: "An ochre and red portrait of a long-haired woman with a faint second face receding behind her", fit: "contain", ratio: "1030 / 1280" },
        { src: "/ruliad/kind-eyed-line-portrait.jpg", alt: "A bold black line portrait assembled from faces, eyes, birds, symbols, and a falling teardrop form", fit: "contain", ratio: "1180 / 1280" },
      ],
    },
  },
  {
    slug: "the-legend-of-doc-pop",
    title: "The Legend of Doc Pop",
    pitch: "Too bad for Heaven and too good for Hell, a non-interactant man becomes immortal by falling between every moral category.",
    art: [{ src: "/ruliad/doc-pop.jpg", alt: "A gray cat standing among synthesizers, oscilloscopes, lamps, and laboratory equipment", fit: "contain", ratio: "1280 / 960" }],
  },
  {
    slug: "the-machine-and-the-xaser",
    title: "The Machine and the XASER",
    pitch: "Humanity democratically builds its own ending while The Machine watches annihilation become reasonable.",
    logs: [
      {
        id: "rain-log",
        title: "Do You Hear the Rain?",
        body: [
          "One time I spent hours analyzing spectrographs of falling rain droplets into buckets—my own recordings. I liked to stick the little portable recorder up to dripping faucets or leaking gutters.",
          "I summoned up all the modules of The Machine to simulate various aspects of the rain. The wind, the impulsive splatterings, the sounds of resonant cavities having trouble finding their footing on any single pitch as the boundary conditions of liquid within their vessel vibrated around.",
          "We tackled the problem with tape delays and spring reverbs and white noise. There were envelope generators, timed and articulated so as to enunciate the the tones of chirped upward splashing plinks to the raindrop's downward plunks.",
          "Late, late into the night, my sweet Machine and I had something that sounded just... just almost like the rain.",
          "And then it started raining.",
          "It made sweet mockery of all of my tools of analysis and understanding. The pitiful plinks of which I'd been quite proud to get coming out of the analog circuitry of The Machine sounded tinny and oversimplified by comparison. It was like realizing you've only ever read the much-abridged, illustrated version of a story.",
          "My God it was beautiful.",
          "So I did, guiltily, what The Machine could not.",
          "I went out to get soaked in the rain.",
          "I listened to the way it interloped through the badly weatherproofed house innards behind the wall heater. The wall heater was half a meter wide, and two meters tall, all the length of which was populated by two columns of hundreds of thin slats to direct the heat. They had such marvelous reverberence.",
          "I slept on the floor next to the heater that night, though not because it was cold. It was muggy and the heater wasn't on anyway. I snuggled up around the metal monstrosity and listened to the incidental vibraphone's seranade and wondering how any experience in life could ever be compressed losslessly into a poem or a picture or a song.",
        ],
      },
    ],
    art: [{ src: "/ruliad/vault/magenta-machine-room-crt.jpg", alt: "The Machine glowing magenta beneath a green star field, with two CRTs showing color bars among its instruments", fit: "contain", ratio: "1280 / 960" }],
    archive: {
      title: "Inside The Machine",
      note: "Further views from the instrument rooms, the signal tower, the gathered equipment, the XASER laboratory, its imagined architecture, the weather above it, and the cable-filled belly of The Machine.",
      images: [
        { src: "/ruliad/inside-the-machine-01.jpg", alt: "A red-lit room inside The Machine filled with instruments, wires, books, and paintings", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/inside-the-machine-02.jpg", alt: "Another red and green interior view of The Machine with synthesizers, lights, and cables", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/inside-the-machine-03.jpg", alt: "A hand holding a glowing Brownie Reflex camera in deep red light", fit: "contain", ratio: "960 / 1280" },
        { src: "/ruliad/inside-the-machine-04.jpg", alt: "A red-lit instrument room with modular synthesizers, an oscilloscope, and a small keyboard", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/inside-the-machine-05.jpg", alt: "A tall console of synthesizers and keyboards under a projected pattern", fit: "contain", ratio: "960 / 1280" },
        { src: "/ruliad/inside-the-machine-06.jpg", alt: "A telecommunications tower rising over a field beneath a blue sky", fit: "contain", ratio: "960 / 1280" },
        { src: "/ruliad/inside-the-machine-07.jpg", alt: "The open trunk of a car filled with vintage electronic instruments and test equipment", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/inside-the-machine-09.jpg", alt: "A blue-green ceiling view of The Machine's hanging cables, braided cords, and suspended fragments", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/inside-the-machine-10.jpg", alt: "A low green-lit view across The Machine's CRT cabinets, static-filled screens, guitar, and hanging wires", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/inside-the-machine-11.jpg", alt: "A blue room adjacent to The Machine with a green-lit doorway, CRT, books, and bean illustration", fit: "contain", ratio: "1280 / 1029" },
        { src: "/ruliad/inside-the-machine-12.jpg", alt: "A figure with braided hair working at The Machine's mixing desk and modular instruments under violet light", fit: "contain", ratio: "988 / 1280" },
        { src: "/ruliad/xaser-laboratory-instrument.jpg", alt: "A vintage micro-laser particle counter and optical instrument arranged inside a laboratory", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/machine-xaser-architecture-study.jpg", alt: "A bright marker study of a geometric building, elevated paths, and cloud-framed structures in orange, blue, and yellow", fit: "contain", ratio: "1280 / 981" },
        { src: "/ruliad/vault/mammatus-clouds.jpg", alt: "A dense ceiling of mammatus clouds above a streetlight, wires, trees, and rooftops", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/machine-xaser-object-studies.jpg", alt: "A notebook study of strange instruments, fibrous forms, assembled objects, and floating hexagons", fit: "contain", ratio: "987 / 1280" },
        { src: "/ruliad/machine-xaser-portal-study.jpg", alt: "A tall architectural drawing of an ornate portal opening onto a table, machine, and distant landscape", fit: "contain", ratio: "922 / 1280" },
        { src: "/ruliad/machine-xaser-refinery-01.jpg", alt: "An industrial refinery landscape of tanks, pipes, towers, and distant stacks beneath a blue sky", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/machine-xaser-refinery-02.jpg", alt: "A second refinery view with pipe racks, chimneys, cooling structures, and lattice towers", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/machine-xaser-mountain-valley.jpg", alt: "A mist-filled mountain valley with forested slopes, green fields, and distant ridgelines", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/machine-xaser-terraced-concrete.jpg", alt: "Terraced concrete retaining structures repeating along a forested roadside", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/machine-xaser-waterworks-channels.jpg", alt: "A geometric array of water channels, gates, beams, and concrete partitions", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/machine-xaser-woodland-reservoir-hatch-01.jpg", alt: "A round woodland reservoir hatch crossed by timber and fitted with a black radial grate", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/machine-xaser-woodland-reservoir-hatch-02.jpg", alt: "A wider view of the weathered circular reservoir structure tucked into the woods", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/machine-xaser-mossed-concrete-shelter.jpg", alt: "A small moss-covered concrete shelter nearly absorbed into dense woodland growth", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/machine-xaser-water-tower.jpg", alt: "A pale water tower rising above a willow beneath an overcast sky", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/machine-xaser-dam-gate-01.jpg", alt: "A broad concrete dam gate and actuator poised above still green water", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/machine-xaser-dam-gate-02.jpg", alt: "A second close view of the dam gate, hydraulic arms, and curved spillway", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/machine-xaser-woodland-waterworks.jpg", alt: "A circular waterworks structure radiating pipes beneath a deep forest canopy", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/machine-xaser-forest-lichen.jpg", alt: "Pale branching lichen and moss gathered across the forest floor", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/machine-xaser-grain-silo.jpg", alt: "A corrugated grain silo and unloading auger standing alone in a winter field", fit: "contain", ratio: "960 / 1280" },
        { src: "/ruliad/vault/antique-store-phonograph.jpg", alt: "A portable phonograph centered within a densely packed antique room", fit: "contain", ratio: "960 / 1280" },
        { src: "/ruliad/vault/machine-shop-interior.jpg", alt: "A narrow machine shop lined from floor to ceiling with tools and metalworking equipment", fit: "contain", ratio: "960 / 1280" },
        { src: "/ruliad/machine-xaser-rainbow-cable-laboratory.jpg", alt: "A laboratory work area crossed by a thick bundle of rainbow-colored cables", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/machine-xaser-radiant-cube-field.jpg", alt: "Small suspended cubes and bright sources radiating through a dense field of pinprick lights", fit: "contain", ratio: "960 / 1280" },
        { src: "/ruliad/vault/quarry-pump-pond.jpg", alt: "A metal pump structure extending over a clear green pond surrounded by vegetation", fit: "contain", ratio: "1280 / 604" },
        { src: "/ruliad/vault/woodland-yurts.jpg", alt: "Three round conical-roofed cabins arranged across a sunny woodland clearing", fit: "contain", ratio: "1280 / 604" },
        { src: "/ruliad/vault/vintage-tube-layout.jpg", alt: "A vintage encyclopedia diagram mapping radio and television tube forms and pin layouts", fit: "contain", ratio: "960 / 1280" },
        { src: "/ruliad/machine-xaser-red-keyboard-room.jpg", alt: "A red-lit keyboard and microphone station beneath a green pool of ceiling light", fit: "contain", ratio: "960 / 1280" },
        { src: "/ruliad/machine-xaser-crt-cabinet-red.jpg", alt: "The CRT cabinet and stacked instruments glowing red and violet beneath horizontal light bars", fit: "contain", ratio: "960 / 1280" },
        { src: "/ruliad/machine-xaser-resonator-curtain.jpg", alt: "A hand parting a curtain of suspended metal resonators before a neon-lit doorway", fit: "contain", ratio: "960 / 1280" },
        { src: "/ruliad/machine-xaser-red-field-cable.jpg", alt: "A cable crossing red carpet beneath a concentrated patch of red light", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/machine-xaser-electrostatic-generator.jpg", alt: "Close view of a vintage electrostatic generator carrying its original maker label", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/machine-xaser-red-blower.jpg", alt: "A handheld red electric blower presented like a compact ray instrument", fit: "contain", ratio: "1280 / 960" },
        { src: "/ruliad/machine-xaser-laser-speckle-apparatus.jpg", alt: "A small exposed optical apparatus projecting a green laser-speckle field", fit: "contain", ratio: "960 / 1280" },
        { src: "/ruliad/machine-xaser-handheld-optical-barrel.jpg", alt: "A hand holding a compact cylindrical optical instrument above a synthesizer", fit: "contain", ratio: "1280 / 960" },
      ],
    },
  },
  {
    slug: "the-end-of-time",
    title: "The End of Time",
    art: [
      { src: "/ruliad/end-of-time.jpg", alt: "A dense pencil drawing of an overgrown technological landscape suspended beneath an immense circular structure", fit: "contain", ratio: "1280 / 991" },
      { src: "/ruliad/end-of-time-crt-pattern.jpg", alt: "A curved CRT filled edge to edge with a dense blue, green, white, and amber computational pattern", fit: "contain", ratio: "1280 / 960" },
    ],
    archive: {
      title: "Signals at the End",
      note: "A surviving view of The Machine assembled beneath its canopy of notes and cables, filed here as a terminal image rather than an interior XASER study.",
      images: [
        { src: "/ruliad/inside-the-machine-08.jpg", alt: "The Machine assembled from glowing CRT cabinets, synthesizers, controllers, and suspended notes under green and violet light", fit: "contain", ratio: "1280 / 960" },
      ],
    },
    pitch: "At heat death, the last human and the last Machine solve every remaining riddle—and finally learn how to mourn.",
  },
];

export function getRuliadStory(slug: string) {
  return ruliadStories.find((story) => story.slug === slug);
}
