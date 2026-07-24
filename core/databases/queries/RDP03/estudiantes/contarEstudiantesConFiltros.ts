import { executeMongoOperation } from "../../../connectors/mongodb";
import { RDP03 } from "../../../../../src/interfaces/shared/RDP03Instancias";
import { RolesSistema } from "../../../../../src/interfaces/shared/RolesSistema";
import {
  construirPipelineBaseEstudiantes,
  FiltrosBusquedaEstudiante,
} from "./_utils/construirPipelineEstudiantes";

export async function contarEstudiantesConFiltros(
  filtros: FiltrosBusquedaEstudiante,
  instanciaEnUso: RDP03 | undefined,
  rol: RolesSistema = RolesSistema.Directivo,
): Promise<number> {
  const pipeline = construirPipelineBaseEstudiantes(filtros);
  pipeline.push({ $count: "total" });

  const resultado = await executeMongoOperation<{ total: number }[]>(
    instanciaEnUso,
    {
      operation: "aggregate",
      collection: "T_Estudiantes",
      pipeline,
      options: {},
    },
    rol,
  );

  return resultado && resultado.length > 0 ? resultado[0].total : 0;
}
