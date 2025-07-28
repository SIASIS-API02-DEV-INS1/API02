// // src/lib/helpers/verificators/verificarBloqueoRol.ts
// import { Request, NextFunction } from "express";
// import { RolesSistema } from "../../../interfaces/shared/RolesSistema";
// import { RolesTexto } from "../../../../assets/RolesTextosEspañol";
// import { ErrorObjectGeneric } from "../../../interfaces/shared/errors/details";
// import {
//   PermissionErrorTypes,
//   SystemErrorTypes,
// } from "../../../interfaces/shared/errors";



// /**
//  * Verifica si un rol está bloqueado y configura el error correspondiente
//  * Migrado a MongoDB manteniendo retrocompatibilidad total
//  * @param req - Objeto Request de Express
//  * @param rol - Rol a verificar (del enum RolesSistema)
//  * @param next - Función NextFunction de Express
//  * @returns Promesa<boolean> - true si está bloqueado, false si no
//  */
// export async function verificarBloqueoRol(
//   req: Request,
//   rol: RolesSistema,
//   next: NextFunction
// ): Promise<boolean> {
//   try {
//     // Usar la función de MongoDB que implementa la misma lógica que PostgreSQL
//     const bloqueo = await verificarBloqueoRolComplejo(rol);

//     if (bloqueo) {
//       const ahora = new Date();
//       const tiempoDesbloqueo =
//         bloqueo.Timestamp_Desbloqueo && bloqueo.Timestamp_Desbloqueo > 0
//           ? new Date(Number(bloqueo.Timestamp_Desbloqueo) * 1000)
//           : null;

//       const tiempoRestante = tiempoDesbloqueo
//         ? Math.ceil(
//             (tiempoDesbloqueo.getTime() - ahora.getTime()) / (1000 * 60)
//           )
//         : null;

//       // Obtener el nombre plural del rol desde el objeto RolesTexto
//       const nombreRolPlural = RolesTexto[rol].plural.toLowerCase();

//       // Configurar el error en el request exactamente como antes
//       req.authError = {
//         type: PermissionErrorTypes.ROLE_BLOCKED,
//         message: bloqueo.Bloqueo_Total
//           ? `Acceso permanentemente bloqueado para ${nombreRolPlural}. Contacte al administrador del sistema.`
//           : `Acceso temporalmente bloqueado para ${nombreRolPlural}. Intente nuevamente más tarde.`,
//         details: {
//           esBloqueoPermanente: bloqueo.Bloqueo_Total,
//           tiempoDesbloqueo: tiempoDesbloqueo?.toISOString(),
//           tiempoRestanteMinutos: tiempoRestante,
//           tiempoRestanteFormateado: tiempoRestante
//             ? tiempoRestante > 60
//               ? `${Math.floor(tiempoRestante / 60)} horas y ${
//                   tiempoRestante % 60
//                 } minutos`
//               : `${tiempoRestante} minutos`
//             : "Indefinido",
//           fechaActual: ahora.toISOString(),
//           fechaDesbloqueo: tiempoDesbloqueo?.toLocaleDateString("es-ES", {
//             day: "2-digit",
//             month: "2-digit",
//             year: "numeric",
//             hour: "2-digit",
//             minute: "2-digit",
//           }),
//         },
//       };
//       next();
//       return true;
//     }
//     return false;
//   } catch (error) {
//     console.error(`Error MongoDB verificando bloqueo para rol ${rol}:`, error);

//     // Mantener el mismo manejo de errores que en la versión PostgreSQL
//     req.authError = {
//       type: SystemErrorTypes.DATABASE_ERROR,
//       message: "Error al verificar el estado del rol",
//       details: error as ErrorObjectGeneric,
//     };
//     next();
//     return true; // Consideramos que hay bloqueo en caso de error para ser conservadores
//   }
// }

// /**
//  * Función de utilidad para verificar bloqueo sin configurar el request
//  * Útil para uso directo en rutas de login
//  * @param rol - Rol a verificar
//  * @returns Promesa con la información del bloqueo o null
//  */
// export async function verificarBloqueoRolSimple(rol: RolesSistema) {
//   try {
//     return await verificarBloqueoRolComplejo(rol);
//   } catch (error) {
//     console.error(`Error verificando bloqueo simple para rol ${rol}:`, error);
//     throw error;
//   }
// }

// /**
//  * Función para obtener información detallada de bloqueo formateada
//  * Útil para respuestas de API en rutas de login
//  * @param rol - Rol a verificar
//  * @returns Información completa del bloqueo con mensajes formateados
//  */
// export async function obtenerInformacionBloqueo(rol: RolesSistema) {
//   try {
//     const bloqueo = await verificarBloqueoRolComplejo(rol);

//     if (!bloqueo) {
//       return null;
//     }

//     const tiempoActual = Math.floor(Date.now() / 1000);
//     const timestampDesbloqueo = Number(bloqueo.Timestamp_Desbloqueo);

//     // Determinamos si es un bloqueo permanente
//     const esBloqueoPermanente =
//       timestampDesbloqueo <= 0 || timestampDesbloqueo <= tiempoActual;

//     // Calculamos el tiempo restante solo si NO es un bloqueo permanente
//     let tiempoRestante = "Permanente";
//     let fechaFormateada = "No definida";

//     if (!esBloqueoPermanente) {
//       const tiempoRestanteSegundos = timestampDesbloqueo - tiempoActual;
//       const horasRestantes = Math.floor(tiempoRestanteSegundos / 3600);
//       const minutosRestantes = Math.floor((tiempoRestanteSegundos % 3600) / 60);
//       tiempoRestante = `${horasRestantes}h ${minutosRestantes}m`;

//       // Formatear fecha de desbloqueo
//       const fechaDesbloqueo = new Date(timestampDesbloqueo * 1000);
//       fechaFormateada = fechaDesbloqueo.toLocaleString("es-ES", {
//         day: "2-digit",
//         month: "2-digit",
//         year: "numeric",
//         hour: "2-digit",
//         minute: "2-digit",
//       });
//     }

//     // Obtener el nombre del rol
//     const nombreRol = RolesTexto[rol].plural.toLowerCase();

//     return {
//       bloqueado: true,
//       esBloqueoPermanente,
//       tiempoActualUTC: tiempoActual,
//       timestampDesbloqueoUTC: timestampDesbloqueo,
//       tiempoRestante,
//       fechaDesbloqueo: fechaFormateada,
//       mensaje: esBloqueoPermanente
//         ? `El acceso para ${nombreRol} está permanentemente bloqueado`
//         : `El acceso para ${nombreRol} está temporalmente bloqueado`,
//       nombreRol: RolesTexto[rol].plural,
//     };
//   } catch (error) {
//     console.error(
//       `Error obteniendo información de bloqueo para rol ${rol}:`,
//       error
//     );
//     throw error;
//   }
// }
