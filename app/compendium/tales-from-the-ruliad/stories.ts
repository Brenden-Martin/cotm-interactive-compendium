type RuliadIllustration = {
  src: string;
  alt: string;
  fit?: "contain" | "cover";
};

type RuliadStory = {
  slug: string;
  title: string;
  pitch: string;
  art?: readonly RuliadIllustration[];
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
    pitch: "A universe declares its physical and narrative rules—and quietly admits that explanation is already storytelling.",
  },
  {
    slug: "hands",
    title: "Hands",
    pitch: "An astronaut loses sensation, sight of himself, and the hands that once held his life together.",
    art: [{ src: "/ruliad/hands.jpg", alt: "An astronaut held above the enormous black silhouette of a hand", fit: "contain" }],
  },
  {
    slug: "lobotomy",
    title: "Lobotomy",
    pitch: "A man deletes himself piece by piece, preserving only the scraps he hopes deserve to survive him.",
    art: [{ src: "/ruliad/lobotomy.jpg", alt: "A plain white hand-drawn rat mark on a black field", fit: "contain" }],
  },
  {
    slug: "kind-eyed-stranger",
    title: "Kind-Eyed Stranger",
    pitch: "A friend to everyone and a stranger to himself, guided by a few fortunes and the choice to be kind.",
    art: [{ src: "/ruliad/kind-eyed-stranger.jpg", alt: "A pencil portrait surrounded by floating eyes, loops, and symbols", fit: "contain" }],
  },
  {
    slug: "the-legend-of-doc-pop",
    title: "The Legend of Doc Pop",
    pitch: "Too bad for Heaven and too good for Hell, a non-interactant man becomes immortal by falling between every moral category.",
    art: [{ src: "/ruliad/doc-pop.jpg", alt: "A gray cat standing among synthesizers, oscilloscopes, lamps, and laboratory equipment", fit: "cover" }],
  },
  {
    slug: "the-machine-and-the-xaser",
    title: "The Machine and the XASER",
    pitch: "Humanity democratically builds its own ending while The Machine watches annihilation become reasonable.",
    art: [
      { src: "/ruliad/inside-the-machine-01.jpg", alt: "A red-lit room inside The Machine filled with instruments, wires, books, and paintings", fit: "cover" },
      { src: "/ruliad/inside-the-machine-02.jpg", alt: "Another red and green interior view of The Machine with synthesizers, lights, and cables", fit: "cover" },
    ],
    archive: {
      title: "Inside The Machine",
      note: "Ten further views from the instrument rooms, the signal tower, the gathered equipment, and the cable-filled belly of The Machine.",
      images: [
        { src: "/ruliad/inside-the-machine-03.jpg", alt: "A hand holding a glowing Brownie Reflex camera in deep red light", fit: "cover" },
        { src: "/ruliad/inside-the-machine-04.jpg", alt: "A red-lit instrument room with modular synthesizers, an oscilloscope, and a small keyboard", fit: "cover" },
        { src: "/ruliad/inside-the-machine-05.jpg", alt: "A tall console of synthesizers and keyboards under a projected pattern", fit: "cover" },
        { src: "/ruliad/inside-the-machine-06.jpg", alt: "A telecommunications tower rising over a field beneath a blue sky", fit: "cover" },
        { src: "/ruliad/inside-the-machine-07.jpg", alt: "The open trunk of a car filled with vintage electronic instruments and test equipment", fit: "cover" },
        { src: "/ruliad/inside-the-machine-08.jpg", alt: "The Machine assembled from glowing CRT cabinets, synthesizers, controllers, and suspended notes under green and violet light", fit: "cover" },
        { src: "/ruliad/inside-the-machine-09.jpg", alt: "A blue-green ceiling view of The Machine's hanging cables, braided cords, and suspended fragments", fit: "cover" },
        { src: "/ruliad/inside-the-machine-10.jpg", alt: "A low green-lit view across The Machine's CRT cabinets, static-filled screens, guitar, and hanging wires", fit: "cover" },
        { src: "/ruliad/inside-the-machine-11.jpg", alt: "A blue room adjacent to The Machine with a green-lit doorway, CRT, books, and bean illustration", fit: "cover" },
        { src: "/ruliad/inside-the-machine-12.jpg", alt: "A figure with braided hair working at The Machine's mixing desk and modular instruments under violet light", fit: "cover" },
      ],
    },
  },
  {
    slug: "the-end-of-time",
    title: "The End of Time",
    pitch: "At heat death, the last human and the last Machine solve every remaining riddle—and finally learn how to mourn.",
  },
];

export function getRuliadStory(slug: string) {
  return ruliadStories.find((story) => story.slug === slug);
}
