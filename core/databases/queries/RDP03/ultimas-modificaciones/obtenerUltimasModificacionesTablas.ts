// src/core/databases/queries/RDP03/ultimas-modificaciones/obtenerUltimasModificacionesTablas.ts
import { RDP03 } from "../../../../../src/interfaces/shared/RDP03Instancias";
import { executeMongoOperation } from "../../../connectors/mongodb";
import { RolesSistema } from "../../../../../src/interfaces/shared/RolesSistema";
import {
  convertirFiltroParaMongoDB,
  crearPipelineEstandar,
  transformarResultadoMongoDB,
} from "../../../../../src/interfaces/shared/RDP03/RDP03_Tablas";
import { T_Ultima_Modificacion_Tablas } from "@prisma/client";

/**
 * Proyección personalizada para transformar campos
 */
const PROYECCION_RESPUESTA = {
  Nombre_Tabla: "$_id", // En esta tabla, _id es el Nombre_Tabla
  Tipo_Modificacion: "$Operacion",
  Fecha_Modificacion: 1,
  Detalle_Modificacion: "$Usuario_Modificacion",
  Cantidad_Filas: 1,
  _id: 0,
};

/**
 * Obtiene las últimas modificaciones de todas las tablas
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Lista de modificaciones de tablas ordenadas por fecha descendente
 */
export async function obtenerUltimasModificacionesTablas(
  instanciaEnUso?: RDP03
): Promise<T_Ultima_Modificacion_Tablas[]> {
  try {
    // Pipeline optimizado usando el sistema de utilidades
    const pipeline = [
      // Proyectar y transformar campos para mantener compatibilidad
      {
        $project: PROYECCION_RESPUESTA,
      },
      // Ordenar por fecha descendente
      {
        $sort: {
          Fecha_Modificacion: -1,
        },
      },
    ];

    const modificaciones = await executeMongoOperation<
      T_Ultima_Modificacion_Tablas[]
    >(
      instanciaEnUso,
      {
        operation: "aggregate",
        collection: "T_Ultima_Modificacion_Tablas",
        pipeline,
        options: {},
      },
      RolesSistema.Directivo // Los directivos son quienes típicamente consultan estas modificaciones
    );

    return modificaciones || [];
  } catch (error) {
    console.error("Error obteniendo últimas modificaciones de tablas:", error);
    throw error;
  }
}

/**
 * Obtiene las últimas modificaciones de una tabla específica
 * @param nombreTabla Nombre de la tabla específica
 * @param limite Número máximo de registros a retornar (por defecto 50)
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Lista de modificaciones de la tabla específica
 */
export async function obtenerUltimasModificacionesTablaEspecifica(
  nombreTabla: string,
  limite: number = 50,
  instanciaEnUso?: RDP03
): Promise<T_Ultima_Modificacion_Tablas[]> {
  try {
    // Convertir filtro usando el sistema de mapeo
    const filtroMongoDB = convertirFiltroParaMongoDB(
      "T_Ultima_Modificacion_Tablas",
      {
        Nombre_Tabla: nombreTabla,
      }
    );

    const pipeline = [
      // Filtrar por tabla específica usando filtro convertido
      {
        $match: filtroMongoDB, // Se convierte automáticamente a { _id: nombreTabla }
      },
      // Proyectar y transformar campos
      {
        $project: PROYECCION_RESPUESTA,
      },
      // Ordenar por fecha descendente
      {
        $sort: {
          Fecha_Modificacion: -1,
        },
      },
      // Limitar resultados
      {
        $limit: limite,
      },
    ];

    const modificaciones = await executeMongoOperation<
      T_Ultima_Modificacion_Tablas[]
    >(
      instanciaEnUso,
      {
        operation: "aggregate",
        collection: "T_Ultima_Modificacion_Tablas",
        pipeline,
        options: {},
      },
      RolesSistema.Directivo
    );

    return modificaciones || [];
  } catch (error) {
    console.error(
      `Error obteniendo modificaciones de tabla ${nombreTabla}:`,
      error
    );
    throw error;
  }
}

/**
 * Obtiene las últimas modificaciones usando el transformador automático
 * (Versión alternativa que devuelve datos sin transformar campos)
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Lista de modificaciones con campos originales pero ID transformado
 */
export async function obtenerUltimasModificacionesRaw(
  instanciaEnUso?: RDP03
): Promise<T_Ultima_Modificacion_Tablas[]> {
  try {
    // Usar pipeline estándar del sistema de mapeo
    const pipeline = crearPipelineEstandar("T_Ultima_Modificacion_Tablas", {}, [
      "Operacion",
      "Fecha_Modificacion",
      "Usuario_Modificacion",
      "Cantidad_Filas",
    ]);

    // Agregar ordenamiento
    pipeline.push({
      $sort: {
        Fecha_Modificacion: -1,
      },
    });

    const resultado = await executeMongoOperation<any[]>(
      instanciaEnUso,
      {
        operation: "aggregate",
        collection: "T_Ultima_Modificacion_Tablas",
        pipeline,
        options: {},
      },
      RolesSistema.Directivo
    );

    // Transformar resultado automáticamente
    return (
      transformarResultadoMongoDB<T_Ultima_Modificacion_Tablas[]>(
        "T_Ultima_Modificacion_Tablas",
        resultado
      ) || []
    );
  } catch (error) {
    console.error("Error obteniendo últimas modificaciones raw:", error);
    throw error;
  }
}

/**
 * Actualiza o inserta una modificación de tabla
 * @param datosModificacion Datos de la modificación
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns true si se actualizó/insertó correctamente
 */
export async function actualizarModificacionTabla(
  datosModificacion: {
    Nombre_Tabla: string;
    Operacion: string;
    Fecha_Modificacion?: Date;
    Usuario_Modificacion?: string;
    Cantidad_Filas?: number;
  },
  instanciaEnUso?: RDP03
): Promise<boolean> {
  try {
    // Convertir filtro usando el sistema de mapeo
    const filtroMongoDB = convertirFiltroParaMongoDB(
      "T_Ultima_Modificacion_Tablas",
      {
        Nombre_Tabla: datosModificacion.Nombre_Tabla,
      }
    );

    const resultado = await executeMongoOperation<{
      matchedCount: number;
      modifiedCount: number;
      upsertedCount: number;
    }>(
      instanciaEnUso,
      {
        operation: "updateOne",
        collection: "T_Ultima_Modificacion_Tablas",
        filter: filtroMongoDB,
        data: {
          $set: {
            Operacion: datosModificacion.Operacion,
            Fecha_Modificacion:
              datosModificacion.Fecha_Modificacion || new Date(),
            Usuario_Modificacion:
              datosModificacion.Usuario_Modificacion || null,
            Cantidad_Filas: datosModificacion.Cantidad_Filas || null,
          },
        },
        options: { upsert: true }, // Crear si no existe
      },
      RolesSistema.Directivo
    );

    return (
      (resultado.matchedCount > 0 && resultado.modifiedCount > 0) ||
      resultado.upsertedCount > 0
    );
  } catch (error) {
    console.error("Error actualizando modificación de tabla:", error);
    throw error;
  }
}

/**
 * Obtiene modificaciones por tipo de operación
 * @param tipoOperacion Tipo de operación (INSERT, UPDATE, DELETE)
 * @param limite Número máximo de registros (por defecto 100)
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Lista de modificaciones del tipo especificado
 */
export async function obtenerModificacionesPorTipo(
  tipoOperacion: string,
  limite: number = 100,
  instanciaEnUso?: RDP03
): Promise<T_Ultima_Modificacion_Tablas[]> {
  try {
    const pipeline = [
      // Filtrar por tipo de operación
      {
        $match: {
          Operacion: tipoOperacion,
        },
      },
      // Proyectar y transformar campos
      {
        $project: PROYECCION_RESPUESTA,
      },
      // Ordenar por fecha descendente
      {
        $sort: {
          Fecha_Modificacion: -1,
        },
      },
      // Limitar resultados
      {
        $limit: limite,
      },
    ];

    const modificaciones = await executeMongoOperation<
      T_Ultima_Modificacion_Tablas[]
    >(
      instanciaEnUso,
      {
        operation: "aggregate",
        collection: "T_Ultima_Modificacion_Tablas",
        pipeline,
        options: {},
      },
      RolesSistema.Directivo
    );

    return modificaciones || [];
  } catch (error) {
    console.error(
      `Error obteniendo modificaciones por tipo ${tipoOperacion}:`,
      error
    );
    throw error;
  }
}
