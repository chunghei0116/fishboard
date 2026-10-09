export type Species = {
  id: string;
  chineseName: string;
  englishName: string;
  scientificName?: string;
  pixelImage: string;
  sprite?: number;
  pixelFacing?: "left" | "right";
  pixelInverted?: boolean;
};
export type Catch = {
  id: string;
  speciesId: string;
  date: string;
  time?: string;
  period?: "morning" | "evening";
  location: string;
  latitude?: number;
  longitude?: number;
  length?: number;
  weight?: number;
  photo?: string;
  rod?: string;
  reel?: string;
  line?: string;
  leaderLine?: string;
  gearName?: string;
  lure?: string;
  note?: string;
  created?: string;
  updatedAt?: string;
};
export type SpeciesSummary = Species & {
  totalCaught: number;
  bestLength?: number;
  firstCaughtDate?: string;
};
export type GearProfile = {
  name: string;
  rod?: string;
  reel?: string;
  mainLine?: string;
  leaderLine?: string;
  lure?: string;
};
export type Dataset = {
  species: Species[];
  catches: Catch[];
  gear?: GearProfile;
};
