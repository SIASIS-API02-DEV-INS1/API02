import { RDP03 } from "../../../../../src/interfaces/shared/RDP03Instancias";
import { executeMongoOperation } from "../../../connectors/mongodb";
import { RolesSistema } from "../../../../../src/interfaces/shared/RolesSistema";
import {
  convertirFiltroParaMongoDB,
  RDP03_Nombres_Tablas,
} from "../../../../../src/interfaces/shared/RDP03/RDP03_Tablas";

// Constante para la tabla actual
const TABLA_ACTUAL: RDP03_Nombres_Tablas = "T_Responsables";

/**
 * Actualiza la contraseña de un responsable
 * @param idResponsable Id del responsable
 * @param nuevaContraseña Nueva contraseña ya encriptada
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns true si se actualizó correctamente, false si no se encontró el responsable
 */
export async function actualizarContraseñaResponsable(
  idResponsable: string,
  nuevaContraseña: string,
  instanciaEnUso?: RDP03
): Promise<boolean> {
  try {
    // Convertir filtro usando el sistema de mapeo
    const filtroMongoDB = convertirFiltroParaMongoDB(TABLA_ACTUAL, {
      Id_Responsable: idResponsable,
    });

    const resultado = await executeMongoOperation<{
      matchedCount: number;
      modifiedCount: number;
    }>(
      instanciaEnUso,
      {
        operation: "updateOne",
        collection: TABLA_ACTUAL,
        filter: filtroMongoDB, // Usar filtro convertido
        data: {
          $set: {
            Contraseña: nuevaContraseña,
          },
        },
        options: {},
      },
      RolesSistema.Responsable // Remover parámetros extra
    );

    return resultado.matchedCount !== null && resultado.matchedCount > 0;
  } catch (error) {
    console.error("Error actualizando contraseña del responsable:", error);
    throw error;
  }
}
