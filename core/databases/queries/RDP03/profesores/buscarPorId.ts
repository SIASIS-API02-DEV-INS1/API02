import {
  ProfesorPrimariaGenericoConCelular,
  ProfesorSecundariaGenericoConCelular,
} from "../../../../../src/interfaces/shared/Profesores";
import { RolesSistema } from "../../../../../src/interfaces/shared/RolesSistema";
import { executeMongoOperation } from "../../../connectors/mongodb";

/**
 * Función auxiliar para consultar profesor de primaria
 */
export async function obtenerProfesorPrimaria(
  idProfesor: string,
  rdp03EnUso: any
): Promise<ProfesorPrimariaGenericoConCelular | null> {
  // Aquí iría la consulta a la base de datos MongoDB
  // Similar a como se hace en otras funciones de consulta
  try {
    const profesores = await executeMongoOperation<any[]>(
      rdp03EnUso,
      {
        operation: "find",
        collection: "T_Profesores_Primaria",
        filter: {
          _id: idProfesor,
          Estado: true, // Solo profesores activos
        },
        options: {
          limit: 1,
          projection: {
            _id: 1,
            Nombres: 1,
            Apellidos: 1,
            Genero: 1,
            Celular: 1,
            Google_Drive_Foto_ID: 1,
          },
        },
      },
      RolesSistema.Responsable
    );

    if (!profesores || profesores.length === 0) {
      return null;
    }

    const profesor = profesores[0];
    return {
      Id_Profesor_Primaria: profesor._id,
      Nombres: profesor.Nombres,
      Apellidos: profesor.Apellidos,
      Genero: profesor.Genero,
      Celular: profesor.Celular,
      Google_Drive_Foto_ID: profesor.Google_Drive_Foto_ID || null,
    };
  } catch (error) {
    console.error("Error consultando profesor de primaria:", error);
    throw error;
  }
}

/**
 * Función auxiliar para consultar profesor de secundaria
 */
export async function obtenerProfesorSecundaria(
  idProfesor: string,
  rdp03EnUso: any
) {
  try {
    const profesores = await executeMongoOperation<any[]>(
      rdp03EnUso,
      {
        operation: "find",
        collection: "T_Profesores_Secundaria",
        filter: {
          _id: idProfesor,
          Estado: true, // Solo profesores activos
        },
        options: {
          limit: 1,
          projection: {
            _id: 1,
            Nombres: 1,
            Apellidos: 1,
            Genero: 1,
            Celular: 1,
            Google_Drive_Foto_ID: 1,
          },
        },
      },
      RolesSistema.Responsable
    );

    if (!profesores || profesores.length === 0) {
      return null;
    }

    const profesor = profesores[0];
    return {
      Id_Profesor_Secundaria: profesor._id,
      Nombres: profesor.Nombres,
      Apellidos: profesor.Apellidos,
      Genero: profesor.Genero,
      Celular: profesor.Celular,
      Google_Drive_Foto_ID: profesor.Google_Drive_Foto_ID || null,
    } as ProfesorSecundariaGenericoConCelular;
  } catch (error) {
    console.error("Error consultando profesor de secundaria:", error);
    throw error;
  }
}
