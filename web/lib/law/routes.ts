export const BASE = '/projects/law-firm/sample';
export const R = {
  home: BASE,
  areas: BASE + '/practice-areas',
  team: BASE + '/attorneys',
  fees: BASE + '/fees',
  insights: BASE + '/insights',
  article: BASE + '/insights/dying-without-a-will',
  contact: BASE + '/contact',
  area: (slug: string) => BASE + '/practice-areas/' + slug,
  guide: (slug: string) => BASE + '/insights/' + slug,
};
