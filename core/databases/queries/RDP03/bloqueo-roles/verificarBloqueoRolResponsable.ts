import { Request, NextFunction } from "express";
import { RDP03 } from "../../../../../src/interfaces/shared/RDP03Instancias";
import { executeMongoOperation } from "../../../connectors/mongodb";
import { RolesSistema } from "../../../../../src/interfaces/shared/RolesSistema";
import { RolesTexto } from "../../../../../assets/RolesTextosEspañol";
import { ErrorObjectGeneric } from "../../../../../src/interfaces/shared/errors/details";
import {
  PermissionErrorTypes,
  SystemErrorTypes,
} from "../../../../../src/interfaces/shared/errors";
import { crearPipelineEstandar, RDP03_Nombres_Tablas, transformarResultadoMongoDB } from "../../../../../src/interfaces/shared/RDP03/RDP03_Tablas";



// Constante para la tabla actual
const TABLA_ACTUAL: RDP03_Nombres_Tablas = "T_Bloqueo_Roles";

// Interfaz que representa la estructura de T_Bloqueo_Roles en MongoDB
export interface T_Bloqueo_Roles {
  Id_Bloqueo_Rol: number;
  Rol: string;
  Bloqueo_Total: boolean;
  Timestamp_Desbloqueo: number; // Timestamp Unix para el desbloqueo
}

/**
 * Verifica si un rol está bloqueado y configura el error correspondiente
 * @param req - Objeto Request de Express
 * @param rol - Rol a verificar (del enum RolesSistema)
 * @param next - Función NextFunction de Express
 * @returns Promesa<boolean> - true si está bloqueado, false si no
 */
export async function verificarBloqueoRol(
  req: Request,
  rol: RolesSistema,
  next: NextFunction
): Promise<boolean> {
  try {
    const tiempoActual = Math.floor(Date.now() / 1000);

    // Crear pipeline personalizado para la lógica OR
    const pipeline = [
      {
        $match: {
          Rol: rol,
          $or: [
            {
              Timestamp_Desbloqueo: { $gt: tiempoActual },
            },
            {
              Bloqueo_Total: true,
            },
          ],
        },
      },
      {
        $limit: 1,
      },
    ];

    const resultado = await executeMongoOperation<any[]>(
      undefined, // instancia automática
      {
        operation: "aggregate",
        collection: TABLA_ACTUAL,
        pipeline,
        options: {},
      }
    );

    // Transformar resultado usando el sistema estándar
    const bloqueosTransformados = transformarResultadoMongoDB<
      T_Bloqueo_Roles[]
    >(TABLA_ACTUAL, resultado);

    const bloqueo =
      Array.isArray(bloqueosTransformados) && bloqueosTransformados.length > 0
        ? bloqueosTransformados[0]
        : null;

    if (bloqueo) {
      const ahora = new Date();
      const tiempoDesbloqueo =
        bloqueo.Timestamp_Desbloqueo && bloqueo.Timestamp_Desbloqueo > 0
          ? new Date(bloqueo.Timestamp_Desbloqueo * 1000)
          : null;

      const tiempoRestante =
        tiempoDesbloqueo && !bloqueo.Bloqueo_Total
          ? Math.ceil(
              (tiempoDesbloqueo.getTime() - ahora.getTime()) / (1000 * 60)
            )
          : null;

      // Obtener el nombre plural del rol desde el objeto RolesTexto
      const nombreRolPlural = RolesTexto[rol].plural.toLowerCase();

      req.authError = {
        type: PermissionErrorTypes.ROLE_BLOCKED,
        message: bloqueo.Bloqueo_Total
          ? `Acceso permanentemente bloqueado para ${nombreRolPlural}. Contacte al administrador del sistema.`
          : `Acceso temporalmente bloqueado para ${nombreRolPlural}. Intente nuevamente más tarde.`,
        details: {
          esBloqueoPermanente: bloqueo.Bloqueo_Total,
          tiempoDesbloqueo: tiempoDesbloqueo?.toISOString(),
          tiempoRestanteMinutos: tiempoRestante,
          tiempoRestanteFormateado: tiempoRestante
            ? tiempoRestante > 60
              ? `${Math.floor(tiempoRestante / 60)} horas y ${
                  tiempoRestante % 60
                } minutos`
              : `${tiempoRestante} minutos`
            : "Indefinido",
          fechaActual: ahora.toISOString(),
          fechaDesbloqueo: tiempoDesbloqueo?.toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      };
      next();
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error al verificar bloqueo de rol:", error);
    req.authError = {
      type: SystemErrorTypes.DATABASE_ERROR,
      message: "Error al verificar el estado del rol",
      details: error as ErrorObjectGeneric,
    };
    next();
    return true; // Consideramos que hay bloqueo en caso de error para ser conservadores
  }
}

// ========== FUNCIONES ESPECÍFICAS POR ROL ==========

/**
 * Verifica si existe un bloqueo para el rol Directivo
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Información del bloqueo o null si no existe
 */
export async function verificarBloqueoRolDirectivo(
  instanciaEnUso?: RDP03
): Promise<T_Bloqueo_Roles | null> {
  try {
    // Crear pipeline usando el sistema de mapeo
    const pipeline = crearPipelineEstandar(TABLA_ACTUAL, {
      Rol: RolesSistema.Directivo,
      Bloqueo_Total: true,
    });

    const resultado = await executeMongoOperation<any[]>(instanciaEnUso, {
      operation: "aggregate",
      collection: TABLA_ACTUAL,
      pipeline,
      options: {},
    });

    // Transformar resultado
    const bloqueoTransformado = transformarResultadoMongoDB<T_Bloqueo_Roles[]>(
      TABLA_ACTUAL,
      resultado
    );

    return Array.isArray(bloqueoTransformado) && bloqueoTransformado.length > 0
      ? bloqueoTransformado[0]
      : null;
  } catch (error) {
    console.error("Error verificando bloqueo Directivo:", error);
    throw error;
  }
}

/**
 * Verifica si existe un bloqueo para el rol Auxiliar
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Información del bloqueo o null si no existe
 */
export async function verificarBloqueoRolAuxiliar(
  instanciaEnUso?: RDP03
): Promise<T_Bloqueo_Roles | null> {
  try {
    // Crear pipeline usando el sistema de mapeo
    const pipeline = crearPipelineEstandar(TABLA_ACTUAL, {
      Rol: RolesSistema.Auxiliar,
      Bloqueo_Total: true,
    });

    const resultado = await executeMongoOperation<any[]>(instanciaEnUso, {
      operation: "aggregate",
      collection: TABLA_ACTUAL,
      pipeline,
      options: {},
    });

    // Transformar resultado
    const bloqueoTransformado = transformarResultadoMongoDB<T_Bloqueo_Roles[]>(
      TABLA_ACTUAL,
      resultado
    );

    return Array.isArray(bloqueoTransformado) && bloqueoTransformado.length > 0
      ? bloqueoTransformado[0]
      : null;
  } catch (error) {
    console.error("Error verificando bloqueo Auxiliar:", error);
    throw error;
  }
}

/**
 * Verifica si existe un bloqueo para el rol Profesor de Primaria
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Información del bloqueo o null si no existe
 */
export async function verificarBloqueoRolProfesorPrimaria(
  instanciaEnUso?: RDP03
): Promise<T_Bloqueo_Roles | null> {
  try {
    // Crear pipeline usando el sistema de mapeo
    const pipeline = crearPipelineEstandar(TABLA_ACTUAL, {
      Rol: RolesSistema.ProfesorPrimaria,
      Bloqueo_Total: true,
    });

    const resultado = await executeMongoOperation<any[]>(instanciaEnUso, {
      operation: "aggregate",
      collection: TABLA_ACTUAL,
      pipeline,
      options: {},
    });

    // Transformar resultado
    const bloqueoTransformado = transformarResultadoMongoDB<T_Bloqueo_Roles[]>(
      TABLA_ACTUAL,
      resultado
    );

    return Array.isArray(bloqueoTransformado) && bloqueoTransformado.length > 0
      ? bloqueoTransformado[0]
      : null;
  } catch (error) {
    console.error("Error verificando bloqueo Profesor Primaria:", error);
    throw error;
  }
}

/**
 * Verifica si existe un bloqueo para el rol Profesor de Secundaria
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Información del bloqueo o null si no existe
 */
export async function verificarBloqueoRolProfesorSecundaria(
  instanciaEnUso?: RDP03
): Promise<T_Bloqueo_Roles | null> {
  try {
    // Crear pipeline usando el sistema de mapeo
    const pipeline = crearPipelineEstandar(TABLA_ACTUAL, {
      Rol: RolesSistema.ProfesorSecundaria,
      Bloqueo_Total: true,
    });

    const resultado = await executeMongoOperation<any[]>(instanciaEnUso, {
      operation: "aggregate",
      collection: TABLA_ACTUAL,
      pipeline,
      options: {},
    });

    // Transformar resultado
    const bloqueoTransformado = transformarResultadoMongoDB<T_Bloqueo_Roles[]>(
      TABLA_ACTUAL,
      resultado
    );

    return Array.isArray(bloqueoTransformado) && bloqueoTransformado.length > 0
      ? bloqueoTransformado[0]
      : null;
  } catch (error) {
    console.error("Error verificando bloqueo Profesor Secundaria:", error);
    throw error;
  }
}

/**
 * Verifica si existe un bloqueo para el rol Tutor
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Información del bloqueo o null si no existe
 */
export async function verificarBloqueoRolTutor(
  instanciaEnUso?: RDP03
): Promise<T_Bloqueo_Roles | null> {
  try {
    // Crear pipeline usando el sistema de mapeo
    const pipeline = crearPipelineEstandar(TABLA_ACTUAL, {
      Rol: RolesSistema.Tutor,
      Bloqueo_Total: true,
    });

    const resultado = await executeMongoOperation<any[]>(instanciaEnUso, {
      operation: "aggregate",
      collection: TABLA_ACTUAL,
      pipeline,
      options: {},
    });

    // Transformar resultado
    const bloqueoTransformado = transformarResultadoMongoDB<T_Bloqueo_Roles[]>(
      TABLA_ACTUAL,
      resultado
    );

    return Array.isArray(bloqueoTransformado) && bloqueoTransformado.length > 0
      ? bloqueoTransformado[0]
      : null;
  } catch (error) {
    console.error("Error verificando bloqueo Tutor:", error);
    throw error;
  }
}

/**
 * Verifica si existe un bloqueo para el rol Responsable
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Información del bloqueo o null si no existe
 */
export async function verificarBloqueoRolResponsable(
  instanciaEnUso?: RDP03
): Promise<T_Bloqueo_Roles | null> {
  try {
    // Crear pipeline usando el sistema de mapeo
    const pipeline = crearPipelineEstandar(TABLA_ACTUAL, {
      Rol: RolesSistema.Responsable,
      Bloqueo_Total: true,
    });

    const resultado = await executeMongoOperation<any[]>(
      instanciaEnUso,
      {
        operation: "aggregate",
        collection: TABLA_ACTUAL,
        pipeline,
        options: {},
      },
      RolesSistema.Responsable
    );

    // Transformar resultado
    const bloqueoTransformado = transformarResultadoMongoDB<T_Bloqueo_Roles[]>(
      TABLA_ACTUAL,
      resultado
    );

    return Array.isArray(bloqueoTransformado) && bloqueoTransformado.length > 0
      ? bloqueoTransformado[0]
      : null;
  } catch (error) {
    console.error("Error verificando bloqueo Responsable:", error);
    throw error;
  }
}

/**
 * Verifica si existe un bloqueo para el rol Personal Administrativo
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Información del bloqueo o null si no existe
 */
export async function verificarBloqueoRolPersonalAdministrativo(
  instanciaEnUso?: RDP03
): Promise<T_Bloqueo_Roles | null> {
  try {
    // Crear pipeline usando el sistema de mapeo
    const pipeline = crearPipelineEstandar(TABLA_ACTUAL, {
      Rol: RolesSistema.PersonalAdministrativo,
      Bloqueo_Total: true,
    });

    const resultado = await executeMongoOperation<any[]>(instanciaEnUso, {
      operation: "aggregate",
      collection: TABLA_ACTUAL,
      pipeline,
      options: {},
    });

    // Transformar resultado
    const bloqueoTransformado = transformarResultadoMongoDB<T_Bloqueo_Roles[]>(
      TABLA_ACTUAL,
      resultado
    );

    return Array.isArray(bloqueoTransformado) && bloqueoTransformado.length > 0
      ? bloqueoTransformado[0]
      : null;
  } catch (error) {
    console.error("Error verificando bloqueo Personal Administrativo:", error);
    throw error;
  }
}
