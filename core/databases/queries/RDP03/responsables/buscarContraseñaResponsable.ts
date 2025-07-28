import { RDP03 } from "../../../../../src/interfaces/shared/RDP03Instancias";
import { buscarResponsablePorDNISelect } from "./buscarResponsablePorDNI";

/**
 * Busca la contraseña de un responsable por DNI
 * @param dniResponsable DNI del responsable
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Contraseña encriptada del responsable o null si no existe
 */
export async function buscarContraseñaResponsable(
  dniResponsable: string,
  instanciaEnUso?: RDP03
): Promise<string | null> {
  const responsable = await buscarResponsablePorDNISelect(
    dniResponsable,
    ["Contraseña"],
    instanciaEnUso
  );
  return responsable ? responsable.Contraseña : null;
}
