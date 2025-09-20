import { RegistroAsistenciaExistente } from "../../../../../src/interfaces/shared/AsistenciasEscolares";
import { RDP03 } from "../../../../../src/interfaces/shared/RDP03Instancias";
import { RolesSistema } from "../../../../../src/interfaces/shared/RolesSistema";
import { executeMongoOperation } from "../../../connectors/mongodb";

/**
 * Obtiene todas las asistencias mensuales de los estudiantes de un aula
 */
export async function obtenerAsistenciasMensualesDeAula(
  idAula: string,
  tabla: string,
  mes: number,
  instanciaEnUso?: RDP03
): Promise<RegistroAsistenciaExistente[] | null> {
  try {
    // Primero obtenemos todos los estudiantes del aula
    const estudiantesAula = await executeMongoOperation<any[]>(
      instanciaEnUso,
      {
        operation: "find",
        collection: "T_Estudiantes",
        filter: {
          Id_Aula: idAula,
          Estado: true, // Solo estudiantes activos
        },
        options: {
          projection: { _id: 1 },
        },
      },
      RolesSistema.Directivo
    );

    if (!estudiantesAula || estudiantesAula.length === 0) {
      return null;
    }

    // Extraer solo los IDs de estudiantes
    const idsEstudiantes = estudiantesAula.map((estudiante) => estudiante._id);

    // Obtener las asistencias de todos esos estudiantes para el mes específico
    const asistencias = await executeMongoOperation<any[]>(
      instanciaEnUso,
      {
        operation: "find",
        collection: tabla as any,
        filter: {
          Id_Estudiante: { $in: idsEstudiantes },
          Mes: mes,
        },
        options: {
          projection: {
            _id: 1,
            Id_Estudiante: 1,
            Mes: 1,
            Asistencias_Mensuales: 1,
          },
        },
      },
      RolesSistema.Directivo
    );

    if (!asistencias || asistencias.length === 0) {
      return null;
    }

    // Mapear al formato de interfaz esperado
    return asistencias.map((registro) => ({
      _id: registro._id,
      Id_Estudiante: registro.Id_Estudiante,
      Mes: registro.Mes,
      Asistencias_Mensuales: registro.Asistencias_Mensuales,
    }));
  } catch (error) {
    console.error("Error obteniendo asistencias mensuales del aula:", error);
    throw error;
  }
}
