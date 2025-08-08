import { NivelEducativo } from "../interfaces/shared/NivelEducativo"

export const GRADOS_EDUCATIVOS_POR_NIVELES: Record<NivelEducativo, {Minimo: number, Maximo: number}>= {
  [NivelEducativo.PRIMARIA]: {
    Minimo: 1,
    Maximo: 6,
  },
  [NivelEducativo.SECUNDARIA]: {
    Minimo: 1,
    Maximo: 5,
  },
};
