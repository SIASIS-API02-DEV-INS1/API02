import { RDP03 } from "../../../../../src/interfaces/shared/RDP03Instancias";
import { RolesSistema } from "../../../../../src/interfaces/shared/RolesSistema";
import { executeMongoOperation } from "../../../connectors/mongodb";

/**
 * Verifica si un estudiante tiene relación con un responsable
 */
export async function verificarRelacionEstudianteResponsable(
  idEstudiante: string,
  idResponsable: string,
  instanciaEnUso?: RDP03
): Promise<boolean> {
  try {
    const relacion = await executeMongoOperation<any[]>(
      instanciaEnUso,
      {
        operation: "find",
        collection: "T_Relaciones_E_R",
        filter: {
          Id_Estudiante: idEstudiante,
          Id_Responsable: idResponsable,
        },
        options: { limit: 1 },
      },
      RolesSistema.Responsable
    );

    return relacion && relacion.length > 0;
  } catch (error) {
    console.error("Error verificando relación estudiante-responsable:", error);
    throw error;
  }
}
