import { T_Aulas } from "@prisma/client";
import { RDP03 } from "../../../../../src/interfaces/shared/RDP03Instancias";
import { RolesSistema } from "../../../../../src/interfaces/shared/RolesSistema";
import { executeMongoOperation } from "../../../connectors/mongodb";

type DatosAula = Omit<
  T_Aulas,
  "Id_Profesor_Primaria" | "Id_Profesor_Secundaria"
>;

/**
 * Obtiene los datos básicos de un aula
 */
export async function obtenerDatosAula(
  idAula: string,
  instanciaEnUso?: RDP03
): Promise<DatosAula | null> {
  try {
    const resultado = await executeMongoOperation<any[]>(
      instanciaEnUso,
      {
        operation: "find",
        collection: "T_Aulas",
        filter: { _id: idAula },
        options: {
          limit: 1,
          projection: {
            _id: 1,
            Nivel: 1,
            Grado: 1,
            Seccion: 1,
            Color: 1,
          },
        },
      },
      RolesSistema.Directivo
    );

    if (!resultado || resultado.length === 0) {
      return null;
    }

    const aula = resultado[0];
    return {
      Id_Aula: aula._id,
      Nivel: aula.Nivel,
      Grado: aula.Grado,
      Seccion: aula.Seccion,
      Color: aula.Color,
    };
  } catch (error) {
    console.error("Error obteniendo datos del aula:", error);
    throw error;
  }
}
