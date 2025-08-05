import { RDP03 } from "../../../../../src/interfaces/shared/RDP03Instancias";
import { buscarResponsablePorIdSelect } from "./buscarResponsablePorId";

/**
 * Busca la contraseña de un responsable por Id
 * @param idResponsable Id del responsable
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Contraseña encriptada del responsable o null si no existe
 */
export async function buscarContraseñaResponsable(
  idResponsable: string,
  instanciaEnUso?: RDP03
): Promise<string | null> {
  const responsable = await buscarResponsablePorIdSelect(
    idResponsable,
    ["Contraseña"],
    instanciaEnUso
  );
  return responsable ? responsable.Contraseña : null;
}
