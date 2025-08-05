import { RDP03 } from "../../../../../src/interfaces/shared/RDP03Instancias";
import { RolesSistema } from "../../../../../src/interfaces/shared/RolesSistema";
import { executeMongoOperation } from "../../../connectors/mongodb";

/**
 * Función auxiliar: Obtiene todos los estudiantes relacionados con un responsable
 * @param idResponsable Id del responsable
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Array de estudiantes relacionados con el responsable
 */
export async function obtenerEstudiantesRelacionadosParaResponsable(
  idResponsable: string,
  instanciaEnUso?: RDP03
): Promise<
  Array<{
    Id_Estudiante: string;
    Nombres: string;
    Apellidos: string;
    Estado: boolean;
    Id_Aula: string | null;
    Tipo_Relacion: string;
  }>
> {
  try {
    const estudiantes = await executeMongoOperation<any[]>(
      instanciaEnUso,
      {
        operation: "aggregate",
        collection: "T_Relaciones_E_R",
        pipeline: [
          {
            $match: {
              Id_Responsable: idResponsable,
            },
          },
          {
            $lookup: {
              from: "T_Estudiantes",
              localField: "Id_Estudiante",
              foreignField: "_id",
              as: "estudiante",
            },
          },
          {
            $unwind: "$estudiante",
          },
          // Proyección usando el sistema de mapeo
          {
            $project: {
              Id_Estudiante: "$estudiante._id",
              Nombres: "$estudiante.Nombres",
              Apellidos: "$estudiante.Apellidos",
              Estado: "$estudiante.Estado",
              Id_Aula: "$estudiante.Id_Aula",
              Tipo_Relacion: "$Tipo",
              _id: 0,
            },
          },
          {
            $sort: {
              Apellidos: 1,
              Nombres: 1,
            },
          },
        ],
        options: {},
      },
      RolesSistema.Responsable
    );

    return estudiantes || [];
  } catch (error) {
    console.error("Error obteniendo estudiantes del responsable:", error);
    throw error;
  }
}