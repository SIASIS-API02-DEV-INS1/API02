import { NivelEducativo } from "../src/interfaces/shared/NivelEducativo";

export const NivelesEducativosTextos:Record<NivelEducativo, string> = {
  [NivelEducativo.PRIMARIA]: "Primaria",
  [NivelEducativo.SECUNDARIA]: "Secundaria",
} as const;