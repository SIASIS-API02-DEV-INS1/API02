import { RDP03 } from "../../../../../src/interfaces/shared/RDP03Instancias";
import { RolesSistema } from "../../../../../src/interfaces/shared/RolesSistema";
import { executeMongoOperation } from "../../../connectors/mongodb";

/**
 * Obtiene las asistencias mensuales del estudiante
 */
export async function obtenerAsistenciasMensualesEstudiante(
  idEstudiante: string,
  tabla: string,
  mes: number,
  instanciaEnUso?: RDP03
): Promise<string | null> {
  try {
    const resultado = await executeMongoOperation<any[]>(
      instanciaEnUso,
      {
        operation: "find",
        collection: tabla as any,
        filter: {
          Id_Estudiante: idEstudiante,
          Mes: mes,
        },
        options: { limit: 1 },
      },
      RolesSistema.Responsable
    );

    if (!resultado || resultado.length === 0) {
      return null;
    }

    return resultado[0].Asistencias_Mensuales;
  } catch (error) {
    console.error("Error obteniendo asistencias mensuales:", error);
    throw error;
  }
}
