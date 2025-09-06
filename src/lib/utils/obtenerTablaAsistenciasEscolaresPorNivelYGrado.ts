import { NivelEducativo } from "../../interfaces/shared/NivelEducativo";

/**
 * Determina la tabla de asistencias correcta según nivel y grado
 */
export function obtenerTablaAsistenciasEscolaresPorNivelYGrado(
  nivel: NivelEducativo,
  grado: number
): string {
  if (nivel === NivelEducativo.PRIMARIA) {
    return `T_A_E_P_${grado}`;
  } else if (nivel === NivelEducativo.SECUNDARIA) {
    return `T_A_E_S_${grado}`;
  } else {
    throw new Error(`Nivel educativo no válido: ${nivel}`);
  }
}
