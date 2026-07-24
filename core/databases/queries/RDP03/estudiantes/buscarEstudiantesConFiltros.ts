import { executeMongoOperation } from "../../../connectors/mongodb";
import { RDP03 } from "../../../../../src/interfaces/shared/RDP03Instancias";
import { RolesSistema } from "../../../../../src/interfaces/shared/RolesSistema";
import {
  construirPipelineBaseEstudiantes,
  FiltrosBusquedaEstudiante,
} from "./_utils/construirPipelineEstudiantes";
import { EstudiantesListItem } from "../../../../../src/interfaces/shared/apis/api02/estudiantes/types";

export async function buscarEstudiantesConFiltros(
  filtros: FiltrosBusquedaEstudiante,
  instanciaEnUso: RDP03 | undefined,
  numeroPagina: number,
  cantidadResultadosPorPagina: number,
  rol: RolesSistema = RolesSistema.Directivo,
): Promise<EstudiantesListItem[]> {
  const pipeline = construirPipelineBaseEstudiantes(filtros);

  const skip = (numeroPagina - 1) * cantidadResultadosPorPagina;

  pipeline.push(
    { $sort: { Apellidos: 1, Nombres: 1 } },
    { $skip: skip },
    { $limit: cantidadResultadosPorPagina },
    {
      $project: {
        _id: 0,
        Id_Estudiante: "$_id",
        Nombres: 1,
        Apellidos: 1,
        Estado: 1,
        Google_Drive_Foto_ID: 1,
        Aula: {
          $cond: [
            { $ifNull: ["$aula", false] },
            {
              Id_Aula: "$aula._id",
              Nivel: "$aula.Nivel",
              Grado: "$aula.Grado",
              Seccion: "$aula.Seccion",
              Color: "$aula.Color",
            },
            null,
          ],
        },
      },
    },
  );

  const resultado = await executeMongoOperation<EstudiantesListItem[]>(
    instanciaEnUso,
    {
      operation: "aggregate",
      collection: "T_Estudiantes",
      pipeline,
      options: {},
    },
    rol,
  );

  return resultado || [];
}
