import { T_Responsables } from "@prisma/client";
import { RDP03 } from "../../../../../src/interfaces/shared/RDP03Instancias";
import { RolesSistema } from "../../../../../src/interfaces/shared/RolesSistema";
import { executeMongoOperation } from "../../../connectors/mongodb";
import {
  convertirFiltroParaMongoDB,
  crearPipelineEstandar,
  crearProyeccionMongoDB,
  transformarResultadoMongoDB,
} from "../../../../../src/interfaces/shared/RDP03/RDP03_Tablas";



/**
 * Busca un responsable por su Id
 * @param idResponsable Id del responsable
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Datos del responsable o null si no existe
 */
export async function buscarResponsablePorId(
  idResponsable: string,
  instanciaEnUso?: RDP03
): Promise<T_Responsables | null> {
  try {
    // Crear pipeline usando el sistema de mapeo
    const pipeline = crearPipelineEstandar("T_Responsables", {
      Id_Responsable: idResponsable,
    });

    // Ejecutar operación
    const resultado = await executeMongoOperation<any[]>(
      instanciaEnUso,
      {
        operation: "aggregate",
        collection: "T_Responsables",
        pipeline,
        options: {},
      },
      RolesSistema.Responsable
    );

    // Transformar resultado automáticamente
    const responsableTransformado = transformarResultadoMongoDB<
      T_Responsables[]
    >("T_Responsables", resultado);

    return Array.isArray(responsableTransformado) &&
      responsableTransformado.length > 0
      ? responsableTransformado[0]
      : null;
  } catch (error) {
    console.error("Error buscando responsable por Id:", error);
    throw error;
  }
}

/**
 * Busca un responsable por su Id y selecciona campos específicos
 * @param idResponsable Id del responsable
 * @param campos Campos específicos a seleccionar (keyof T_Responsables)
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Datos parciales del responsable o null si no existe
 */
export async function buscarResponsablePorIdSelect<
  K extends keyof T_Responsables
>(
  idResponsable: string,
  campos: K[],
  instanciaEnUso?: RDP03
): Promise<Pick<T_Responsables, K> | null> {
  try {
    // Crear proyección usando el sistema de mapeo
    const proyeccion = crearProyeccionMongoDB(
      "T_Responsables",
      campos.map((campo) => String(campo))
    );

    // Convertir filtro
    const filtroMongoDB = convertirFiltroParaMongoDB("T_Responsables", {
      Id_Responsable: idResponsable,
    });

    // Ejecutar operación
    const resultado = await executeMongoOperation<any[]>(
      instanciaEnUso,
      {
        operation: "aggregate",
        collection: "T_Responsables",
        pipeline: [{ $match: filtroMongoDB }, { $project: proyeccion }],
        options: {},
      },
      RolesSistema.Responsable
    );

    // Transformar resultado
    const responsableTransformado = transformarResultadoMongoDB<
      Pick<T_Responsables, K>[]
    >("T_Responsables", resultado);

    return Array.isArray(responsableTransformado) &&
      responsableTransformado.length > 0
      ? responsableTransformado[0]
      : null;
  } catch (error) {
    console.error("Error buscando responsable por Id con proyección:", error);
    throw error;
  }
}

/**
 * Verifica si un responsable tiene estudiantes activos asociados
 * @param idResponsable Id del responsable
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns true si tiene al menos un estudiante activo, false en caso contrario
 */
export async function verificarEstudiantesActivosResponsable(
  idResponsable: string,
  instanciaEnUso?: RDP03
): Promise<boolean> {
  try {
    // Usar agregación optimizada
    const resultado = await executeMongoOperation<
      { tiene_estudiantes_activos: boolean }[]
    >(
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
          {
            $match: {
              "estudiante.Estado": true,
            },
          },
          {
            $count: "estudiantes_activos",
          },
        ],
        options: {},
      },
      RolesSistema.Responsable
    );

    return resultado && resultado.length > 0;
  } catch (error) {
    console.error(
      "Error verificando estudiantes activos del responsable:",
      error
    );
    throw error;
  }
}

/**
 * Función auxiliar: Busca un responsable por nombre de usuario con campos específicos para login
 * @param nombreUsuario Nombre de usuario del responsable
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Datos del responsable necesarios para login o null si no existe
 */
export async function buscarResponsablePorNombreUsuarioParaLogin(
  nombreUsuario: string,
  instanciaEnUso?: RDP03
): Promise<Pick<
  T_Responsables,
  | "Id_Responsable"
  | "Nombres"
  | "Apellidos"
  | "Nombre_Usuario"
  | "Contraseña"
  | "Google_Drive_Foto_ID"
> | null> {
  try {
    // Usar directamente findOne para asegurar que obtenemos todos los campos
    const responsable = await executeMongoOperation<T_Responsables>(
      instanciaEnUso,
      {
        operation: "findOne",
        collection: "T_Responsables",
        filter: { Nombre_Usuario: nombreUsuario },
        options: {
          projection: {
            Id_Responsable: 1,
            Nombres: 1,
            Apellidos: 1,
            Nombre_Usuario: 1,
            Contraseña: 1,
            Google_Drive_Foto_ID: 1,
          },
        },
      },
      RolesSistema.Responsable
    );

    console.log("Responsable encontrado (findOne):", responsable); // Debug temporal

    return responsable;
  } catch (error) {
    console.error("Error buscando responsable para login:", error);
    throw error;
  }
}

/**
 * Función alternativa: Si el sistema de transformación está causando problemas
 * @param nombreUsuario Nombre de usuario del responsable
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Datos completos del responsable o null si no existe
 */
export async function buscarResponsablePorNombreUsuarioDirecto(
  nombreUsuario: string,
  instanciaEnUso?: RDP03
): Promise<T_Responsables | null> {
  try {
    // Pipeline manual sin usar el sistema estándar para debugging
    const pipeline = [
      {
        $match: {
          Nombre_Usuario: nombreUsuario,
        },
      },
      {
        $project: {
          Id_Responsable: 1,
          Nombres: 1,
          Apellidos: 1,
          Nombre_Usuario: 1,
          Contraseña: 1,
          Celular: 1,
          Google_Drive_Foto_ID: 1,
        },
      },
    ];

    const resultado = await executeMongoOperation<any[]>(
      instanciaEnUso,
      {
        operation: "aggregate",
        collection: "T_Responsables",
        pipeline,
        options: {},
      },
      RolesSistema.Responsable
    );

    console.log("Resultado pipeline directo:", resultado); // Debug temporal

    if (resultado && resultado.length > 0) {
      // No usar transformarResultadoMongoDB para evitar problemas
      const responsable = resultado[0];

      // Mapear manualmente el resultado
      return {
        Id_Responsable: responsable.Id_Responsable || responsable._id,
        Nombres: responsable.Nombres,
        Apellidos: responsable.Apellidos,
        Nombre_Usuario: responsable.Nombre_Usuario,
        Contraseña: responsable.Contraseña,
        Celular: responsable.Celular,
        Google_Drive_Foto_ID: responsable.Google_Drive_Foto_ID,
      } as T_Responsables;
    }

    return null;
  } catch (error) {
    console.error("Error en búsqueda directa de responsable:", error);
    throw error;
  }
}



/**
 * Función auxiliar: Verifica si un responsable existe y está activo (tiene estudiantes activos)
 * @param idResponsable Id del responsable
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Objeto con información del responsable y estado de actividad
 */
export async function verificarEstadoCompletoResponsable(
  idResponsable: string,
  instanciaEnUso?: RDP03
): Promise<{
  existe: boolean;
  responsable: T_Responsables | null;
  tieneEstudiantesActivos: boolean;
  cantidadEstudiantesActivos: number;
}> {
  try {
    // Buscar el responsable usando la función optimizada
    const responsable = await buscarResponsablePorId(
      idResponsable,
      instanciaEnUso
    );

    if (!responsable) {
      return {
        existe: false,
        responsable: null,
        tieneEstudiantesActivos: false,
        cantidadEstudiantesActivos: 0,
      };
    }

    // Contar estudiantes activos
    const conteoEstudiantes = await executeMongoOperation<
      Array<{ cantidad: number }>
    >(
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
          {
            $match: {
              "estudiante.Estado": true,
            },
          },
          {
            $count: "cantidad",
          },
        ],
        options: {},
      },
      RolesSistema.Responsable
    );

    const cantidadEstudiantesActivos =
      conteoEstudiantes && conteoEstudiantes.length > 0
        ? conteoEstudiantes[0].cantidad
        : 0;

    return {
      existe: true,
      responsable,
      tieneEstudiantesActivos: cantidadEstudiantesActivos > 0,
      cantidadEstudiantesActivos,
    };
  } catch (error) {
    console.error("Error verificando estado completo del responsable:", error);
    throw error;
  }
}

/**
 * Función auxiliar: Obtiene todos los responsables con paginación
 * @param limite Número máximo de responsables a devolver
 * @param salto Número de responsables a saltar (para paginación)
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Array de responsables con Id_Responsable renombrado
 */
export async function obtenerResponsablesPaginados(
  limite: number = 10,
  salto: number = 0,
  instanciaEnUso?: RDP03
): Promise<T_Responsables[]> {
  try {
    // Crear proyección básica
    const proyeccion = crearProyeccionMongoDB("T_Responsables", [
      "Nombres",
      "Apellidos",
      "Nombre_Usuario",
      "Celular",
      "Contraseña",
      "Google_Drive_Foto_ID",
    ]);

    const responsables = await executeMongoOperation<any[]>(
      instanciaEnUso,
      {
        operation: "aggregate",
        collection: "T_Responsables",
        pipeline: [
          {
            $project: proyeccion,
          },
          {
            $sort: { Apellidos: 1, Nombres: 1 },
          },
          {
            $skip: salto,
          },
          {
            $limit: limite,
          },
        ],
        options: {},
      },
      RolesSistema.Responsable
    );

    // Transformar resultado
    return (
      transformarResultadoMongoDB<T_Responsables[]>(
        "T_Responsables",
        responsables
      ) || []
    );
  } catch (error) {
    console.error("Error obteniendo responsables paginados:", error);
    throw error;
  }
}

/**
 * Función auxiliar: Busca responsables por coincidencia de texto
 * @param textoBusqueda Texto a buscar en nombres y apellidos
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Array de responsables que coinciden con la búsqueda
 */
export async function buscarResponsablesPorTexto(
  textoBusqueda: string,
  instanciaEnUso?: RDP03
): Promise<T_Responsables[]> {
  try {
    // Crear proyección para búsqueda
    const proyeccion = crearProyeccionMongoDB("T_Responsables", [
      "Nombres",
      "Apellidos",
      "Nombre_Usuario",
      "Celular"
    ]);

    const pipeline = [
      {
        $match: {
          $or: [
            { Nombres: { $regex: textoBusqueda, $options: "i" } },
            { Apellidos: { $regex: textoBusqueda, $options: "i" } },
            { Nombre_Usuario: { $regex: textoBusqueda, $options: "i" } },
          ],
        },
      },
      {
        $project: proyeccion,
      },
      {
        $sort: { Apellidos: 1, Nombres: 1 },
      },
      {
        $limit: 20, // Limitar resultados para evitar sobrecarga
      },
    ];

    const resultado = await executeMongoOperation<any[]>(
      instanciaEnUso,
      {
        operation: "aggregate",
        collection: "T_Responsables",
        pipeline,
        options: {},
      },
      RolesSistema.Responsable
    );

    // Transformar resultado
    return (
      transformarResultadoMongoDB<T_Responsables[]>("T_Responsables", resultado) ||
      []
    );
  } catch (error) {
    console.error("Error buscando responsables por texto:", error);
    throw error;
  }
}
