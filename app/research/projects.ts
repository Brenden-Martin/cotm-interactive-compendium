export const researchProjects = [
  {
    slug: "mesopyramids",
    title: "Mesopyramids",
    indexNote: "A reserved record for presentations, figures, notebook pages, reports, and future interactive material.",
  },
  {
    slug: "noncontact-respiration-monitoring",
    title: "Noncontact Respiration Monitoring",
    indexNote: "A future home for the project narrative, experimental records, key plots, and demonstrations.",
  },
  {
    slug: "electro-optic-fabry-perot",
    title: "Electro-Optic Fabry–Pérot",
    indexNote: "A prepared archive for research summaries, optical figures, laboratory notes, and simulations.",
  },
] as const;

export function getResearchProject(slug: string) {
  return researchProjects.find((project) => project.slug === slug);
}
