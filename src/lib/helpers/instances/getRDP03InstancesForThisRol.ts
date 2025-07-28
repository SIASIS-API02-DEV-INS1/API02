import {
  AUXILIAR_INSTANCES,
  DIRECTIVO_INSTANCES,
  PERSONAL_ADMIN_INSTANCES,
  PROFESOR_PRIMARIA_INSTANCES,
  PROFESOR_SECUNDARIA_INSTANCES,
  RESPONSABLE_INSTANCES,
  TUTOR_INSTANCES,
} from "../../../constants/RDP03_INSTANCES_DISTRIBUTION";
import { RDP03 } from "../../../interfaces/shared/RDP03Instancias";
import { RolesSistema } from "../../../interfaces/shared/RolesSistema";

/**
 * Obtiene las instancias disponibles para un rol específico
 * @param rol El rol del sistema
 * @returns Array de instancias disponibles para ese rol
 */
export function getRDP03InstancesForThisRol(rol: RolesSistema): RDP03[] {
  switch (rol) {
    case RolesSistema.Directivo:
      return DIRECTIVO_INSTANCES;
    case RolesSistema.Auxiliar:
      return AUXILIAR_INSTANCES;
    case RolesSistema.ProfesorSecundaria:
      return PROFESOR_SECUNDARIA_INSTANCES;
    case RolesSistema.Tutor:
      return TUTOR_INSTANCES;
    case RolesSistema.ProfesorPrimaria:
      return PROFESOR_PRIMARIA_INSTANCES;
    case RolesSistema.PersonalAdministrativo:
      return PERSONAL_ADMIN_INSTANCES;
    case RolesSistema.Responsable:
      return RESPONSABLE_INSTANCES;
    default:
      console.warn(`Rol ${rol} no reconocido`);
      return [];
  }
}
