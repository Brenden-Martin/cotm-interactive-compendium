export const ruliadStories = [
  { slug: "assumptions", title: "Assumptions" },
  { slug: "hands", title: "Hands" },
  { slug: "lobotomy", title: "Lobotomy" },
  { slug: "kind-eyed-stranger", title: "Kind-Eyed Stranger" },
  { slug: "the-legend-of-doc-pop", title: "The Legend of Doc Pop" },
  { slug: "the-machine-and-the-xaser", title: "The Machine and the XASER" },
  { slug: "the-end-of-time", title: "The End of Time" },
] as const;

export function getRuliadStory(slug: string) {
  return ruliadStories.find((story) => story.slug === slug);
}
