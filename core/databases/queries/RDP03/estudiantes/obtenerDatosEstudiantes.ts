import { NivelEducativo } from "../../../../../src/interfaces/shared/NivelEducativo";
import { RDP03 } from "../../../../../src/interfaces/shared/RDP03Instancias";
import { RolesSistema } from "../../../../../src/interfaces/shared/RolesSistema";
import { executeMongoOperation } from "../../../connectors/mongodb";

/**
 * Obtiene los datos básicos del estudiante (nivel, grado, estado)
 */
export async function obtenerDatosEscolaresEstudiantes(
  idEstudiante: string,
  instanciaEnUso?: RDP03
): Promise<{
  existe: boolean;
  estado: boolean;
  nivel?: NivelEducativo;
  grado?: number;
} | null> {
  try {
    const pipeline = [
      {
        $match: {
          _id: idEstudiante,
        },
      },
      {
        $lookup: {
          from: "T_Aulas",
          localField: "Id_Aula",
          foreignField: "_id",
          as: "aula",
        },
      },
      {
        $project: {
          Estado: 1,
          aula: { $arrayElemAt: ["$aula", 0] },
        },
      },
      {
        $project: {
          Estado: 1,
          Nivel: "$aula.Nivel",
          Grado: "$aula.Grado",
        },
      },
    ];

    const resultado = await executeMongoOperation<any[]>(
      instanciaEnUso,
      {
        operation: "aggregate",
        collection: "T_Estudiantes",
        pipeline,
        options: {},
      },
      RolesSistema.Responsable
    );

    if (!resultado || resultado.length === 0) {
      return { existe: false, estado: false };
    }

    const estudiante = resultado[0];
    return {
      existe: true,
      estado: estudiante.Estado,
      nivel: estudiante.Nivel,
      grado: estudiante.Grado,
    };
  } catch (error) {
    console.error("Error obteniendo datos del estudiante:", error);
    throw error;
  }
}
