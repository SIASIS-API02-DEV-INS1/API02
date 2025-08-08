import { GRADOS_EDUCATIVOS_POR_NIVELES } from "../../../../constants/GRADOS_EDUCATIVOS_POR_NIVELES";
import { NivelEducativo } from "../../../../interfaces/shared/NivelEducativo";

export function validarGradoPorNivel(nivel: NivelEducativo, grado: number): boolean {
  if (nivel === NivelEducativo.PRIMARIA) {
    return grado >= GRADOS_EDUCATIVOS_POR_NIVELES[NivelEducativo.PRIMARIA].Minimo && grado <= GRADOS_EDUCATIVOS_POR_NIVELES[NivelEducativo.PRIMARIA].Maximo;
  } else {
    return grado >= GRADOS_EDUCATIVOS_POR_NIVELES[NivelEducativo.SECUNDARIA].Minimo && grado <= GRADOS_EDUCATIVOS_POR_NIVELES[NivelEducativo.SECUNDARIA].Maximo;
  }
}