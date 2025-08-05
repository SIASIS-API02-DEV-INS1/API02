// src/core/databases/queries/RDP03/responsables/actualizarseResponsable.ts
import { RDP03 } from "../../../../../src/interfaces/shared/RDP03Instancias";
import { executeMongoOperation } from "../../../connectors/mongodb";
import { RolesSistema } from "../../../../../src/interfaces/shared/RolesSistema";
import { convertirFiltroParaMongoDB, RDP03_Nombres_Tablas } from "../../../../../src/interfaces/shared/RDP03/RDP03_Tablas";



// Constante para la tabla actual
const TABLA_ACTUAL: RDP03_Nombres_Tablas = "T_Responsables";

/**
 * Actualiza los datos de un responsable (solo celular permitido)
 * @param idResponsable Id del responsable a actualizar
 * @param datos Datos a actualizar
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns true si la actualización fue exitosa, false si no se encontró el responsable
 */
export async function actualizarseResponsable(
  idResponsable: string,
  datos: {
    Celular?: string;
  },
  instanciaEnUso?: RDP03
): Promise<boolean> {
  try {
    // Construir el objeto de actualización dinámicamente
    const updateFields: any = {};

    // Añadir cada campo proporcionado al objeto de actualización
    for (const [key, value] of Object.entries(datos)) {
      if (value !== undefined) {
        updateFields[key] = value;
      }
    }

    // Si no hay campos para actualizar, retornar false
    if (Object.keys(updateFields).length === 0) {
      return false;
    }

    // Convertir filtro usando el sistema de mapeo
    const filtroMongoDB = convertirFiltroParaMongoDB(TABLA_ACTUAL, {
      Id_Responsable: idResponsable,
    });

    // Ejecutar la operación de actualización en MongoDB
    const result = await executeMongoOperation<{
      matchedCount: number;
      modifiedCount: number;
      upsertedCount: number;
    }>(
      instanciaEnUso,
      {
        operation: "updateOne",
        collection: TABLA_ACTUAL,
        filter: filtroMongoDB,
        data: { $set: updateFields },
        options: { upsert: false },
      },
      RolesSistema.Responsable
    );

    // Retornar true si se encontró y modificó al menos un documento
    return result && result.matchedCount > 0 && result.modifiedCount > 0;
  } catch (error) {
    console.error("Error actualizando responsable:", error);
    throw error;
  }
}
