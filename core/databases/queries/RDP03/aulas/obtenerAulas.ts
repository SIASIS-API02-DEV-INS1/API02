// src/core/databases/queries/RDP03/aulas/obtenerAulas.ts
import { RDP03 } from "../../../../../src/interfaces/shared/RDP03Instancias";
import { RolesSistema } from "../../../../../src/interfaces/shared/RolesSistema";
import { executeMongoOperation } from "../../../connectors/mongodb";
import { NivelEducativo } from "../../../../../src/interfaces/shared/NivelEducativo";
import { T_Aulas } from "@prisma/client";

// Interfaz para los filtros
export interface FiltrosAulas {
  nivel?: string; // NivelEducativo.PRIMARIA o "S" - Ahora opcional
  grado?: number; // 1-6 para primaria, 1-5 para secundaria
  idsAulas?: string[]; // Array de IDs específicos
}

/**
 * Obtiene aulas básicas con filtros específicos (solo datos del esquema T_Aulas)
 * @param filtros Filtros a aplicar en la consulta
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Array de aulas (T_Aulas | T_Aulas)
 */
export async function obtenerAulas(
  filtros: FiltrosAulas,
  instanciaEnUso?: RDP03
): Promise<T_Aulas[]> {
  try {
    // Construir el filtro de match dinámicamente
    const matchFilter: any = {};

    // Agregar filtro por nivel solo si se proporciona
    if (filtros.nivel) {
      matchFilter.Nivel = filtros.nivel;
    }

    // Agregar filtro por grado si se proporciona (solo cuando hay nivel)
    if (filtros.grado !== undefined && filtros.nivel) {
      matchFilter.Grado = filtros.grado;
    }

    // Agregar filtro por IDs específicos si se proporciona (tiene prioridad)
    if (filtros.idsAulas && filtros.idsAulas.length > 0) {
      matchFilter._id = { $in: filtros.idsAulas };
      // Si hay IDs específicos, ignorar filtros de nivel y grado
      delete matchFilter.Nivel;
      delete matchFilter.Grado;
    }

    // Pipeline simple usando el sistema estándar
    const pipeline = [
      // Solo agregar $match si hay filtros
      ...(Object.keys(matchFilter).length > 0 ? [{ $match: matchFilter }] : []),
      // Proyección básica para incluir solo campos del esquema T_Aulas
      {
        $project: {
          Id_Aula: "$_id",
          Nivel: 1,
          Grado: 1,
          Seccion: 1,
          Color: 1,
          Id_Profesor_Primaria: 1,
          Id_Profesor_Secundaria: 1,
          _id: 0,
        },
      },
      // Ordenar por Grado y luego por Sección
      {
        $sort: {
          Grado: 1,
          Seccion: 1,
        },
      },
    ];

    // Ejecutar la consulta
    const resultado = await executeMongoOperation<any[]>(
      instanciaEnUso,
      {
        operation: "aggregate",
        collection: "T_Aulas",
        pipeline,
        options: {},
      },
      RolesSistema.Responsable
    );

    // Transformar el resultado a las interfaces específicas
    if (!resultado || resultado.length === 0) {
      return [];
    }

    // Mapear cada aula al tipo correspondiente según el nivel
    const aulasTransformadas = resultado.map((aula) => {
      if (aula.Nivel === NivelEducativo.PRIMARIA) {
        // Aula de Primaria
        const aulaPrimaria: T_Aulas = {
          Id_Aula: aula.Id_Aula,
          Nivel: aula.Nivel,
          Grado: aula.Grado,
          Seccion: aula.Seccion,
          Color: aula.Color,
          Id_Profesor_Primaria: aula.Id_Profesor_Primaria || null,
          Id_Profesor_Secundaria: null, // Siempre null para primaria
        };
        return aulaPrimaria;
      } else {
        // Aula de Secundaria
        const aulaSecundaria: T_Aulas = {
          Id_Aula: aula.Id_Aula,
          Nivel: aula.Nivel,
          Grado: aula.Grado,
          Seccion: aula.Seccion,
          Color: aula.Color,
          Id_Profesor_Primaria: null, // Siempre null para secundaria
          Id_Profesor_Secundaria: aula.Id_Profesor_Secundaria || null,
        };
        return aulaSecundaria;
      }
    });

    return aulasTransformadas;
  } catch (error) {
    console.error("Error obteniendo aulas básicas con filtros:", error);
    throw error;
  }
}

/**
 * Función auxiliar: Obtiene todas las aulas de un nivel específico
 * @param nivel NivelEducativo.PRIMARIA para Primaria, "S" para Secundaria
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Array de aulas del nivel especificado
 */
export async function obtenerAulasPorNivel(
  nivel: NivelEducativo.PRIMARIA | "S",
  instanciaEnUso?: RDP03
): Promise<(T_Aulas | T_Aulas)[]> {
  return obtenerAulas({ nivel }, instanciaEnUso);
}

/**
 * Función auxiliar: Obtiene aulas específicas por sus IDs
 * @param idsAulas Array de IDs de aulas
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Array de aulas encontradas
 */
export async function obtenerAulasPorIds(
  idsAulas: string[],
  instanciaEnUso?: RDP03
): Promise<(T_Aulas | T_Aulas)[]> {
  try {
    const pipeline = [
      {
        $match: {
          _id: { $in: idsAulas },
        },
      },
      {
        $project: {
          Id_Aula: "$_id",
          Nivel: 1,
          Grado: 1,
          Seccion: 1,
          Color: 1,
          Id_Profesor_Primaria: 1,
          Id_Profesor_Secundaria: 1,
          _id: 0,
        },
      },
      {
        $sort: { Grado: 1, Seccion: 1 },
      },
    ];

    const resultado = await executeMongoOperation<any[]>(
      instanciaEnUso,
      {
        operation: "aggregate",
        collection: "T_Aulas",
        pipeline,
        options: {},
      },
      RolesSistema.Responsable
    );

    if (!resultado || resultado.length === 0) {
      return [];
    }

    // Mapear al tipo correspondiente
    const aulasTransformadas = resultado.map((aula) => {
      if (aula.Nivel === NivelEducativo.PRIMARIA) {
        const aulaPrimaria: T_Aulas = {
          Id_Aula: aula.Id_Aula,
          Nivel: aula.Nivel,
          Grado: aula.Grado,
          Seccion: aula.Seccion,
          Color: aula.Color,
          Id_Profesor_Primaria: aula.Id_Profesor_Primaria || null,
          Id_Profesor_Secundaria: null,
        };
        return aulaPrimaria;
      } else {
        const aulaSecundaria: T_Aulas = {
          Id_Aula: aula.Id_Aula,
          Nivel: aula.Nivel,
          Grado: aula.Grado,
          Seccion: aula.Seccion,
          Color: aula.Color,
          Id_Profesor_Primaria: null,
          Id_Profesor_Secundaria: aula.Id_Profesor_Secundaria || null,
        };
        return aulaSecundaria;
      }
    });

    return aulasTransformadas;
  } catch (error) {
    console.error("Error obteniendo aulas por IDs:", error);
    throw error;
  }
}
/**
 * Función auxiliar: Cuenta el total de aulas por nivel
 * @param nivel NivelEducativo.PRIMARIA para Primaria, "S" para Secundaria
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Número total de aulas del nivel
 */
export async function contarAulasPorNivel(
  nivel: NivelEducativo.PRIMARIA | "S",
  instanciaEnUso?: RDP03
): Promise<number> {
  try {
    const resultado = await executeMongoOperation<Array<{ total: number }>>(
      instanciaEnUso,
      {
        operation: "aggregate",
        collection: "T_Aulas",
        pipeline: [
          {
            $match: { Nivel: nivel },
          },
          {
            $count: "total",
          },
        ],
        options: {},
      },
      RolesSistema.Responsable
    );

    return resultado && resultado.length > 0 ? resultado[0].total : 0;
  } catch (error) {
    console.error("Error contando aulas por nivel:", error);
    throw error;
  }
}

/**
 * Función auxiliar: Obtiene aulas de un grado específico
 * @param nivel NivelEducativo.PRIMARIA para Primaria, "S" para Secundaria
 * @param grado Grado específico (1-6 para primaria, 1-5 para secundaria)
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Array de aulas del grado especificado
 */
export async function obtenerAulasPorGrado(
  nivel: NivelEducativo.PRIMARIA | "S",
  grado: number,
  instanciaEnUso?: RDP03
): Promise<(T_Aulas | T_Aulas)[]> {
  return obtenerAulas({ nivel, grado }, instanciaEnUso);
}