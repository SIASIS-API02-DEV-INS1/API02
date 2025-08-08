import { NivelEducativo } from "../../../../interfaces/shared/NivelEducativo";

export function validarNivelEducativo(nivel: string): boolean {
  return Object.values(NivelEducativo).includes(nivel as any);
}