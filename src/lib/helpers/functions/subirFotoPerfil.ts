// src/lib/helpers/functions/fotos-perfil/subirFotoPerfil.ts
import { ActoresSistema } from "../../../interfaces/shared/ActoresSistema";
import { RolesSistema } from "../../../interfaces/shared/RolesSistema";
import {
  RequestErrorTypes,
  SystemErrorTypes,
  UserErrorTypes,
} from "../../../interfaces/shared/errors";
import { deleteFileFromDrive } from "../../../../core/external/google/drive/deleteFileFromDrive";
import { uploadFileToDrive } from "../../../../core/external/google/drive/uploadFileToDrive";
import { RDP03 } from "../../../interfaces/shared/RDP03Instancias";
import { executeMongoOperation } from "../../../../core/databases/connectors/mongodb";
import {
  convertirFiltroParaMongoDB,
  crearProyeccionMongoDB,
  RDP03_Nombres_Tablas,
} from "../../../interfaces/shared/RDP03/RDP03_Tablas";

/**
 * Sube una foto de perfil para cualquier actor del sistema usando MongoDB
 * @param rdp03EnUso Instancia de base de datos MongoDB a utilizar
 * @param actorTipo Tipo de actor (puede ser RolesSistema o Estudiante)
 * @param file Archivo de imagen a subir
 * @param identificador Identificador único del actor
 * @param nombreArchivo Nombre opcional para el archivo
 * @returns Resultado de la operación de subida
 */
export async function subirFotoPerfil(
  rdp03EnUso: RDP03,
  actorTipo: RolesSistema.Responsable | ActoresSistema.Estudiante,
  file: Express.Multer.File,
  identificador: string | number,
  nombreArchivo?: string
): Promise<{
  success: boolean;
  fileId?: string;
  fileUrl?: string;
  message: string;
  errorType?: any;
}> {
  try {
    // Configuración para cada tipo de actor
    const configuracion = {
      [RolesSistema.Responsable]: {
        collection: "T_Responsables" as RDP03_Nombres_Tablas,
        campoId: "Id_Responsable",
        campoDrive: "Google_Drive_Foto_ID",
        campoUsuario: "Nombre_Usuario",
        carpeta: "Fotos de Perfil/Responsables",
        esNumerico: false,
        mensaje: "Responsable",
      },
      [ActoresSistema.Estudiante]: {
        collection: "T_Estudiantes" as RDP03_Nombres_Tablas,
        campoId: "Id_Estudiante",
        campoDrive: "Google_Drive_Foto_ID",
        campoUsuario: "",
        carpeta: "Fotos de Perfil/Estudiantes",
        esNumerico: false,
        mensaje: "Estudiante",
      },
    };

    // Verificar si el tipo de actor está soportado
    if (!configuracion[actorTipo]) {
      return {
        success: false,
        message: "Tipo de actor no soportado",
        errorType: RequestErrorTypes.INVALID_PARAMETERS,
      };
    }

    const config = configuracion[actorTipo];

    // Convertir identificador al tipo adecuado
    const idValor = config.esNumerico
      ? Number(identificador)
      : String(identificador);

    // Crear proyección usando el sistema de mapeo
    const camposProyeccion = [config.campoDrive];
    if (actorTipo !== ActoresSistema.Estudiante) {
      camposProyeccion.push(config.campoUsuario);
    }

    const proyeccionMongoDB = crearProyeccionMongoDB(
      config.collection,
      camposProyeccion
    );

    // Crear filtro usando el sistema de mapeo
    const filtroMongoDB = convertirFiltroParaMongoDB(config.collection, {
      [config.campoId]: idValor,
    });

    console.log("Filtor de mongo", filtroMongoDB);

    // Buscar al actor usando MongoDB
    const actor = await executeMongoOperation<any>(
      rdp03EnUso,
      {
        operation: "findOne",
        collection: config.collection,
        filter: filtroMongoDB,
        options: { projection: proyeccionMongoDB },
      },
      actorTipo as RolesSistema
    );

    if (!actor) {
      return {
        success: false,
        message: `${config.mensaje} no encontrado`,
        errorType: UserErrorTypes.USER_NOT_FOUND,
      };
    }

    // Determinar el nombre del archivo
    const extension = file.originalname.split(".").pop() || "png";
    let archivoFinal;

    if (nombreArchivo) {
      // Si se provee un nombre específico, usar ese
      archivoFinal = `${nombreArchivo}.${extension}`;
    } else if (actorTipo === ActoresSistema.Estudiante) {
      // Para estudiantes, usar el Id
      archivoFinal = `estudiante_${idValor}.${extension}`;
    } else {
      // Para otros roles, usar el nombre de usuario
      archivoFinal = `${actor[config.campoUsuario]}.${extension}`;
    }

    // Eliminar la foto anterior si existe
    if (actor[config.campoDrive]) {
      try {
        await deleteFileFromDrive(actor[config.campoDrive]);
      } catch (error) {
        console.warn("Error al eliminar foto anterior:", error);
        // No fallar la operación por esto
      }
    }

    // Subir la nueva foto
    const resultadoSubida = await uploadFileToDrive(
      file,
      config.carpeta,
      archivoFinal
    );

    // Crear filtro de actualización usando el sistema de mapeo
    const filtroActualizacion = convertirFiltroParaMongoDB(config.collection, {
      [config.campoId]: idValor,
    });

    // Actualizar el registro en MongoDB
    const updateResult = await executeMongoOperation<any>(
      rdp03EnUso,
      {
        operation: "updateOne",
        collection: config.collection,
        filter: filtroActualizacion,
        data: {
          $set: {
            [config.campoDrive]: resultadoSubida.id,
          },
        },
        options: {},
      },
      actorTipo as RolesSistema
    );

    if (!updateResult || updateResult.modifiedCount === 0) {
      return {
        success: false,
        message: `Error al actualizar la foto del ${config.mensaje.toLowerCase()}`,
        errorType: SystemErrorTypes.DATABASE_ERROR,
      };
    }

    // Devolver resultado exitoso
    return {
      success: true,
      message: "Foto de perfil actualizada correctamente",
      fileId: resultadoSubida.id,
      fileUrl: resultadoSubida.webContentLink || resultadoSubida.webViewLink,
    };
  } catch (error) {
    console.error("Error al subir foto de perfil:", error);

    return {
      success: false,
      message: "Error al subir foto de perfil",
      errorType: SystemErrorTypes.UNKNOWN_ERROR,
    };
  }
}

/**
 * Obtiene la información de la foto de perfil de un actor
 * @param rdp03EnUso Instancia de base de datos MongoDB a utilizar
 * @param actorTipo Tipo de actor
 * @param identificador Identificador único del actor
 * @returns Información de la foto de perfil o null si no existe
 */
export async function obtenerFotoPerfil(
  rdp03EnUso: RDP03,
  actorTipo: RolesSistema | ActoresSistema.Estudiante,
  identificador: string | number
): Promise<{
  success: boolean;
  fileId?: string | null;
  message: string;
  errorType?: any;
}> {
  try {
    const configuracion = {
      [RolesSistema.Directivo]: {
        collection: "T_Directivos" as RDP03_Nombres_Tablas,
        campoId: "Id_Directivo",
        campoDrive: "Google_Drive_Foto_ID",
        esNumerico: false,
        mensaje: "Directivo",
      },
      [RolesSistema.Auxiliar]: {
        collection: "T_Auxiliares" as RDP03_Nombres_Tablas,
        campoId: "Id_Auxiliar",
        campoDrive: "Google_Drive_Foto_ID",
        esNumerico: false,
        mensaje: "Auxiliar",
      },
      [RolesSistema.ProfesorPrimaria]: {
        collection: "T_Profesores_Primaria" as RDP03_Nombres_Tablas,
        campoId: "Id_Profesor_Primaria",
        campoDrive: "Google_Drive_Foto_ID",
        esNumerico: false,
        mensaje: "Profesor de primaria",
      },
      [RolesSistema.ProfesorSecundaria]: {
        collection: "T_Profesores_Secundaria" as RDP03_Nombres_Tablas,
        campoId: "Id_Profesor_Secundaria",
        campoDrive: "Google_Drive_Foto_ID",
        esNumerico: false,
        mensaje: "Profesor de secundaria",
      },
      [RolesSistema.Tutor]: {
        collection: "T_Profesores_Secundaria" as RDP03_Nombres_Tablas,
        campoId: "Id_Profesor_Secundaria",
        campoDrive: "Google_Drive_Foto_ID",
        esNumerico: false,
        mensaje: "Tutor",
      },
      [RolesSistema.PersonalAdministrativo]: {
        collection: "T_Personal_Administrativo" as RDP03_Nombres_Tablas,
        campoId: "Id_Personal_Administrativo",
        campoDrive: "Google_Drive_Foto_ID",
        esNumerico: false,
        mensaje: "Personal administrativo",
      },
      [RolesSistema.Responsable]: {
        collection: "T_Responsables" as RDP03_Nombres_Tablas,
        campoId: "Id_Responsable",
        campoDrive: "Google_Drive_Foto_ID",
        esNumerico: false,
        mensaje: "Responsable",
      },
      [ActoresSistema.Estudiante]: {
        collection: "T_Estudiantes" as RDP03_Nombres_Tablas,
        campoId: "Id_Estudiante",
        campoDrive: "Google_Drive_Foto_ID",
        esNumerico: false,
        mensaje: "Estudiante",
      },
    };

    const config = configuracion[actorTipo];
    if (!config) {
      return {
        success: false,
        message: "Tipo de actor no soportado",
        errorType: RequestErrorTypes.INVALID_PARAMETERS,
      };
    }

    const idValor = config.esNumerico
      ? Number(identificador)
      : String(identificador);

    // Crear filtro usando el sistema de mapeo
    const filtroMongoDB = convertirFiltroParaMongoDB(config.collection, {
      [config.campoId]: idValor,
    });

    // Crear proyección usando el sistema de mapeo
    const proyeccionMongoDB = crearProyeccionMongoDB(config.collection, [
      config.campoDrive,
    ]);

    const actor = await executeMongoOperation<any>(
      rdp03EnUso,
      {
        operation: "findOne",
        collection: config.collection,
        filter: filtroMongoDB,
        options: { projection: proyeccionMongoDB },
      },
      actorTipo as RolesSistema
    );

    if (!actor) {
      return {
        success: false,
        message: `${config.mensaje} no encontrado`,
        errorType: UserErrorTypes.USER_NOT_FOUND,
      };
    }

    return {
      success: true,
      message: "Información de foto obtenida correctamente",
      fileId: actor[config.campoDrive] || null,
    };
  } catch (error) {
    console.error("Error al obtener foto de perfil:", error);
    return {
      success: false,
      message: "Error al obtener información de la foto",
      errorType: SystemErrorTypes.UNKNOWN_ERROR,
    };
  }
}

/**
 * Elimina la foto de perfil de un actor
 * @param rdp03EnUso Instancia de base de datos MongoDB a utilizar
 * @param actorTipo Tipo de actor
 * @param identificador Identificador único del actor
 * @returns Resultado de la operación de eliminación
 */
export async function eliminarFotoPerfil(
  rdp03EnUso: RDP03,
  actorTipo: RolesSistema | ActoresSistema.Estudiante,
  identificador: string | number
): Promise<{
  success: boolean;
  message: string;
  errorType?: any;
}> {
  try {
    // Primero obtener la información actual de la foto
    const fotoInfo = await obtenerFotoPerfil(
      rdp03EnUso,
      actorTipo,
      identificador
    );

    if (!fotoInfo.success) {
      return fotoInfo;
    }

    if (!fotoInfo.fileId) {
      return {
        success: false,
        message: "No hay foto de perfil para eliminar",
        errorType: UserErrorTypes.USER_NOT_FOUND,
      };
    }

    const configuracion = {
      [RolesSistema.Directivo]: {
        collection: "T_Directivos" as RDP03_Nombres_Tablas,
        campoId: "Id_Directivo",
        campoDrive: "Google_Drive_Foto_ID",
        esNumerico: false,
        mensaje: "Directivo",
      },
      [RolesSistema.Auxiliar]: {
        collection: "T_Auxiliares" as RDP03_Nombres_Tablas,
        campoId: "Id_Auxiliar",
        campoDrive: "Google_Drive_Foto_ID",
        esNumerico: false,
        mensaje: "Auxiliar",
      },
      [RolesSistema.ProfesorPrimaria]: {
        collection: "T_Profesores_Primaria" as RDP03_Nombres_Tablas,
        campoId: "Id_Profesor_Primaria",
        campoDrive: "Google_Drive_Foto_ID",
        esNumerico: false,
        mensaje: "Profesor de primaria",
      },
      [RolesSistema.ProfesorSecundaria]: {
        collection: "T_Profesores_Secundaria" as RDP03_Nombres_Tablas,
        campoId: "Id_Profesor_Secundaria",
        campoDrive: "Google_Drive_Foto_ID",
        esNumerico: false,
        mensaje: "Profesor de secundaria",
      },
      [RolesSistema.Tutor]: {
        collection: "T_Profesores_Secundaria" as RDP03_Nombres_Tablas,
        campoId: "Id_Profesor_Secundaria",
        campoDrive: "Google_Drive_Foto_ID",
        esNumerico: false,
        mensaje: "Tutor",
      },
      [RolesSistema.PersonalAdministrativo]: {
        collection: "T_Personal_Administrativo" as RDP03_Nombres_Tablas,
        campoId: "Id_Personal_Administrativo",
        campoDrive: "Google_Drive_Foto_ID",
        esNumerico: false,
        mensaje: "Personal administrativo",
      },
      [RolesSistema.Responsable]: {
        collection: "T_Responsables" as RDP03_Nombres_Tablas,
        campoId: "Id_Responsable",
        campoDrive: "Google_Drive_Foto_ID",
        esNumerico: false,
        mensaje: "Responsable",
      },
      [ActoresSistema.Estudiante]: {
        collection: "T_Estudiantes" as RDP03_Nombres_Tablas,
        campoId: "Id_Estudiante",
        campoDrive: "Google_Drive_Foto_ID",
        esNumerico: false,
        mensaje: "Estudiante",
      },
    };

    const config = configuracion[actorTipo];
    const idValor = config.esNumerico
      ? Number(identificador)
      : String(identificador);

    // Eliminar archivo de Google Drive
    try {
      await deleteFileFromDrive(fotoInfo.fileId);
    } catch (error) {
      console.warn("Error al eliminar archivo de Drive:", error);
      // Continuar con la eliminación en base de datos aunque falle Drive
    }

    // Crear filtro usando el sistema de mapeo
    const filtroMongoDB = convertirFiltroParaMongoDB(config.collection, {
      [config.campoId]: idValor,
    });

    // Actualizar el registro en MongoDB para eliminar la referencia
    const updateResult = await executeMongoOperation<any>(
      rdp03EnUso,
      {
        operation: "updateOne",
        collection: config.collection,
        filter: filtroMongoDB,
        data: {
          $unset: {
            [config.campoDrive]: "",
          },
        },
        options: {},
      },
      actorTipo as RolesSistema
    );

    if (!updateResult || updateResult.modifiedCount === 0) {
      return {
        success: false,
        message: `Error al eliminar la referencia de la foto del ${config.mensaje.toLowerCase()}`,
        errorType: SystemErrorTypes.DATABASE_ERROR,
      };
    }

    return {
      success: true,
      message: "Foto de perfil eliminada correctamente",
    };
  } catch (error) {
    console.error("Error al eliminar foto de perfil:", error);
    return {
      success: false,
      message: "Error al eliminar la foto de perfil",
      errorType: SystemErrorTypes.UNKNOWN_ERROR,
    };
  }
}
