import { RDP03 } from "../../../interfaces/shared/RDP03Instancias";
import { RolesSistema } from "../../../interfaces/shared/RolesSistema";
import { getRDP03InstancesForThisRol } from "./getRDP03InstancesForThisRol";

/**
 * Obtiene todas las instancias afectadas por un conjunto de roles
 * @param rolesAfectados Array de roles cuyos datos serán afectados
 * @param instanciaEnUso Instancia que ya se está utilizando y debe excluirse
 * @returns Array de instancias únicas afectadas, excluyendo la instancia en uso
 */
export function getInstanciasRDP03AfectadasPorRoles(
  rolesAfectados: RolesSistema[],
  instanciaEnUso: RDP03
): RDP03[] {
  // Conjunto para almacenar instancias únicas
  const instanciasSet = new Set<RDP03>();

  // Agregar todas las instancias de cada rol al conjunto
  for (const rol of rolesAfectados) {
    const instanciasDeRol = getRDP03InstancesForThisRol(rol);
    for (const instancia of instanciasDeRol) {
      instanciasSet.add(instancia);
    }
  }

  // Eliminar la instancia en uso del conjunto
  instanciasSet.delete(instanciaEnUso);

  // Convertir el conjunto a array
  return Array.from(instanciasSet);
}