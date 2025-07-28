import { T_Responsables } from "@prisma/client";
import { RDP03 } from "../../../../../src/interfaces/shared/RDP03Instancias";
import { crearPipelineEstandar, transformarResultadoMongoDB } from "../../../../../src/interfaces/shared/RDP03/RDP03_Tablas";
import { executeMongoOperation } from "../../../connectors/mongodb";
import { RolesSistema } from "../../../../../src/interfaces/shared/RolesSistema";

/**
 * Función auxiliar: Busca un responsable por nombre de usuario
 * @param nombreUsuario Nombre de usuario del responsable
 * @param instanciaEnUso Instancia específica donde ejecutar la consulta (opcional)
 * @returns Datos del responsable o null si no existe
 */
export async function buscarResponsablePorNombreUsuario(
  nombreUsuario: string,
  instanciaEnUso?: RDP03
): Promise<T_Responsables | null> {
  try {
    // Especificar todos los campos adicionales que necesitamos para el login
    const camposAdicionales = [
      "Nombres",
      "Apellidos",
      "Nombre_Usuario",
      "Contraseña",
      "Celular",
      "Google_Drive_Foto_ID",
    ];

    // Crear pipeline usando el sistema de mapeo con campos adicionales
    const pipeline = crearPipelineEstandar(
      "T_Responsables",
      {
        Nombre_Usuario: nombreUsuario,
      },
      camposAdicionales
    );

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

    console.log("Resultado MongoDB crudo:", resultado); // Debug temporal

    // Transformar resultado
    const responsableTransformado = transformarResultadoMongoDB<
      T_Responsables[]
    >("T_Responsables", resultado);

    return Array.isArray(responsableTransformado) &&
      responsableTransformado.length > 0
      ? responsableTransformado[0]
      : null;
  } catch (error) {
    console.error("Error buscando responsable por nombre de usuario:", error);
    throw error;
  }
}
