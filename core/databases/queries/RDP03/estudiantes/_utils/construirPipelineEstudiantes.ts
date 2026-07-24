import { NivelEducativo } from "../../../../../../src/interfaces/shared/NivelEducativo";

export interface FiltrosBusquedaEstudiante {
  Identificador?: string; // formato "<numero>-<tipo>" donde tipo es "1"|"2"|"3"|"T"
  Nombres?: string;
  Apellidos?: string;
  Nivel?: NivelEducativo | null; // null = "T" (todos)
  Estado?: boolean | null; // null = no filtrar por estado
  Grado?: number | null; // null = "T"
  Seccion?: string | null; // null = "T"
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Construye la condición Mongo para el filtro de Identificador:
 * - Sufijo "1" (DNI): longitud 8 SIN guion, O termina en "-1" (el guion es
 *   opcional en los DNI, a diferencia de los otros tipos)
 * - Sufijo "2"/"3" (Carnet Ext. / Código escolar): guion+sufijo obligatorio
 * - Sufijo "T": ignora el tipo, solo busca el número en cualquier parte
 * - Sin guion en el input: se trata igual que sufijo "T"
 */
function construirCondicionIdentificador(
  identificador: string,
): Record<string, any> {
  const separadorIndex = identificador.lastIndexOf("-");

  if (separadorIndex === -1) {
    const numero = escaparRegex(identificador);
    return { _id: { $regex: numero } };
  }

  const numero = escaparRegex(identificador.slice(0, separadorIndex));
  const tipo = identificador.slice(separadorIndex + 1).toUpperCase();

  if (tipo === "T") {
    return { _id: { $regex: numero } };
  }

  if (tipo === "1") {
    return {
      $or: [
        {
          $and: [
            { $expr: { $eq: [{ $strLenCP: "$_id" }, 8] } },
            { _id: { $regex: numero } },
          ],
        },
        { _id: { $regex: `${numero}.*-1$` } },
      ],
    };
  }

  if (tipo === "2" || tipo === "3") {
    return { _id: { $regex: `${numero}.*-${tipo}$` } };
  }

  // Sufijo desconocido -> se trata como búsqueda libre por seguridad
  return { _id: { $regex: numero } };
}

/**
 * Construye las etapas de pipeline comunes (match a nivel de estudiante +
 * lookup de aula + match a nivel de aula), reutilizables tanto para la
 * búsqueda paginada como para el conteo total.
 */
export function construirPipelineBaseEstudiantes(
  filtros: FiltrosBusquedaEstudiante,
): any[] {
  const pipeline: any[] = [];

  // ---- Filtros a nivel de estudiante (ANTES del lookup) ----
  const condicionesAnd: Record<string, any>[] = [];

  if (filtros.Identificador && filtros.Identificador.trim() !== "") {
    condicionesAnd.push(
      construirCondicionIdentificador(filtros.Identificador.trim()),
    );
  }

  if (filtros.Nombres && filtros.Nombres.trim() !== "") {
    condicionesAnd.push({
      Nombres: {
        $regex: escaparRegex(filtros.Nombres.trim()),
        $options: "i",
      },
    });
  }

  if (filtros.Apellidos && filtros.Apellidos.trim() !== "") {
    condicionesAnd.push({
      Apellidos: {
        $regex: escaparRegex(filtros.Apellidos.trim()),
        $options: "i",
      },
    });
  }

  if (filtros.Estado !== null && filtros.Estado !== undefined) {
    condicionesAnd.push({ Estado: filtros.Estado });
  }

  if (condicionesAnd.length > 0) {
    pipeline.push({ $match: { $and: condicionesAnd } });
  }

  // ---- Lookup del aula ----
  pipeline.push({
    $lookup: {
      from: "T_Aulas",
      localField: "Id_Aula",
      foreignField: "_id",
      as: "aula",
    },
  });

  pipeline.push({
    $unwind: { path: "$aula", preserveNullAndEmptyArrays: true },
  });

  // ---- Filtros a nivel de aula (DESPUÉS del lookup) ----
  const necesitaFiltroDeAula =
    (filtros.Nivel !== null && filtros.Nivel !== undefined) ||
    (filtros.Grado !== null && filtros.Grado !== undefined) ||
    (filtros.Seccion !== null && filtros.Seccion !== undefined);

  if (necesitaFiltroDeAula) {
    const matchAula: Record<string, any> = {};

    if (filtros.Nivel !== null && filtros.Nivel !== undefined) {
      matchAula["aula.Nivel"] = filtros.Nivel;
    }
    if (filtros.Grado !== null && filtros.Grado !== undefined) {
      matchAula["aula.Grado"] = filtros.Grado;
    }
    if (filtros.Seccion !== null && filtros.Seccion !== undefined) {
      matchAula["aula.Seccion"] = filtros.Seccion;
    }

    pipeline.push({ $match: matchAula });
  }

  return pipeline;
}
