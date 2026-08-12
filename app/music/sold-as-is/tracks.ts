export type MorphBank = "calculator" | "tube" | "stellar-a" | "stellar-b" | "stellar-c";

export type SoldAsIsTrack = {
  albumSlug?: string;
  slug: string;
  catalogNumber: string;
  title: string;
  subtitle: string;
  audioSrc: string;
  artifactSrc: string;
  artifactAlt: string;
  boundarySrc: string;
  boundaryLabel: string;
  morphBank: MorphBank;
  seed: number;
  fallbackBpm: number;
  cadenceBeats: number;
  boundaryCycleBeats: number;
  palette: {
    page: string;
    panel: string;
    accent: string;
    ink: string;
    shell: string;
  };
};

export type SoldAsIsAlbum = {
  slug: string;
  title: string;
  catalogNumber: string;
  coverSrc: string;
  coverAlt: string;
  description: string;
  tracks: SoldAsIsTrack[];
};

const machinePalette = {
  page: "#68172b",
  panel: "#301019",
  accent: "#f5cf67",
  ink: "#fff5c9",
  shell: "#9d9676",
};

const stellarPalette = {
  page: "#080716",
  panel: "#17102b",
  accent: "#ffb52c",
  ink: "#f8f2e8",
  shell: "#ded7c4",
};

export const moogTrack: SoldAsIsTrack = {
  slug: "moog-preset-alternate-4",
  catalogNumber: "SAI / 001",
  title: "Moog Preset Alternate 4",
  subtitle: "An alternate recording recovered from the backlog and given a listening machine of its own.",
  audioSrc: "/music/sold-as-is/moog-preset-alternate-4.mp3",
  artifactSrc: "/music/sold-as-is/cotm-calculator.png",
  artifactAlt: "A green pocket synthesizer calculator with Child of the Machine album art taped into its case",
  boundarySrc: "/music/sold-as-is/cotm-calculator.png",
  boundaryLabel: "Calculator cover",
  morphBank: "calculator",
  seed: 0xc07a1404,
  fallbackBpm: 92,
  cadenceBeats: 4,
  boundaryCycleBeats: 32,
  palette: {
    page: "#68172b",
    panel: "#301019",
    accent: "#b7d291",
    ink: "#eee8cf",
    shell: "#778f63",
  },
};

export const manMadeMachineAlbum: SoldAsIsAlbum = {
  slug: "man-made-machine-machine-made-man",
  title: "Man Made Machine {Machine Made Man}",
  catalogNumber: "SAI / ALBUM 01",
  coverSrc: "/music/sold-as-is/man-made-machine-machine-made-man/child-of-the-machine-poster.jpg",
  coverAlt: "The original Child of the Machine computer poster",
  description: "A developing album archive. Tube Groove is the first beta recording placed on the shelf.",
  tracks: [
    {
      albumSlug: "man-made-machine-machine-made-man",
      slug: "tube-groove",
      catalogNumber: "SAI / 002",
      title: "Tube Groove",
      subtitle: "Plucky wah rhythm guitar and a wandering lead, suspended somewhere between an island bar and an old television cabinet.",
      audioSrc: "/music/sold-as-is/man-made-machine-machine-made-man/08-tube-groove.wav",
      artifactSrc: "/music/sold-as-is/man-made-machine-machine-made-man/child-of-the-machine-poster.jpg",
      artifactAlt: "The original Child of the Machine computer poster",
      boundarySrc: "/music/sold-as-is/man-made-machine-machine-made-man/child-of-the-machine-poster.jpg",
      boundaryLabel: "Computer poster",
      morphBank: "tube",
      seed: 0x0800b055,
      fallbackBpm: 94,
      cadenceBeats: 4,
      boundaryCycleBeats: 32,
      palette: machinePalette,
    },
  ],
};

const stellarTrackData = [
  ["peaceful-space-title-sequence", "Peaceful Space {Title Sequence}", "01-peaceful-space-title-sequence.mp3", "stellar-a", 0x51ace001],
  ["rest-shore-leave", "Rest {Shore Leave}", "02-rest-shore-leave.mp3", "stellar-b", 0x51ace002],
  ["not-so-neutral-zone-the-battle-scene", "Not So Neutral Zone {The Battle Scene}", "03-not-so-neutral-zone-the-battle-scene.mp3", "stellar-c", 0x51ace003],
  ["drifting-cryosleep-through-the-super-nova", "Drifting {Cryosleep Through The Super Nova}", "04-drifting-cryosleep-through-the-super-nova.mp3", "stellar-a", 0x51ace004],
  ["a-concert-for-no-one-recreation-time", "A Concert For No One {Recreation Time}", "05-a-concert-for-no-one-recreation-time.mp3", "stellar-b", 0x51ace005],
  ["starlight-one-small-step", "Starlight {One Small Step}", "06-starlight-one-small-step.mp3", "stellar-c", 0x51ace006],
  ["counting-electric-sheep-goodnight-pluto", "Counting Electric Sheep {Goodnight Pluto}", "07-counting-electric-sheep-goodnight-pluto.mp3", "stellar-a", 0x51ace007],
] as const;

export const einKleineSternmusicAlbum: SoldAsIsAlbum = {
  slug: "ein-kleine-sternmusic",
  title: "Ein Kleine Sternmusic",
  catalogNumber: "SAI / ALBUM 02",
  coverSrc: "/music/sold-as-is/ein-kleine-sternmusic/album-art.jpg",
  coverAlt: "A Child of the Machine nebula logo printed on a white paper planet against space",
  description: "Seven small transmissions from a paper planet: the complete numbered album directory.",
  tracks: stellarTrackData.map(([slug, title, file, morphBank, seed], index) => ({
    albumSlug: "ein-kleine-sternmusic",
    slug,
    catalogNumber: `SAI / ${String(index + 3).padStart(3, "0")}`,
    title,
    subtitle: "A recovered movement from Ein Kleine Sternmusic, routed through the shared listening computer.",
    audioSrc: `/music/sold-as-is/ein-kleine-sternmusic/${file}`,
    artifactSrc: "/music/sold-as-is/ein-kleine-sternmusic/cotm.jpg",
    artifactAlt: "The purple and white Child of the Machine wordmark with yellow hazard stripes",
    boundarySrc: "/music/sold-as-is/ein-kleine-sternmusic/album-art.jpg",
    boundaryLabel: "White planet",
    morphBank: morphBank as MorphBank,
    seed,
    fallbackBpm: 96,
    cadenceBeats: index === 2 ? 2 : 4,
    boundaryCycleBeats: index === 2 ? 16 : 32,
    palette: stellarPalette,
  })),
};

export const soldAsIsAlbums = [manMadeMachineAlbum, einKleineSternmusicAlbum];
export const soldAsIsTracks = [moogTrack, ...soldAsIsAlbums.flatMap((album) => album.tracks)];

export function getAlbum(slug: string) {
  return soldAsIsAlbums.find((album) => album.slug === slug);
}

export function getAlbumTrack(albumSlug: string, trackSlug: string) {
  return getAlbum(albumSlug)?.tracks.find((track) => track.slug === trackSlug);
}
