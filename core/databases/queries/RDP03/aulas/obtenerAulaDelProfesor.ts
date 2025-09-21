// core/databases/queries/RDP03/aulas/obtenerAulaDelProfesor.ts
import { T_Aulas } from "@prisma/client";
import { RDP03 } from "../../../../../src/interfaces/shared/RDP03Instancias";
import { RolesSistema } from "../../../../../src/interfaces/shared/RolesSistema";
import { executeMongoOperation } from "../../../connectors/mongodb";

/**
 * Obtiene el aula asignada a un profesor de primaria o tutor (profesor de secundaria con aula)
 */
export async function obtenerAulaDelProfesor(
  idProfesor: string,
  rol: RolesSistema,
  instanciaEnUso?: RDP03
): Promise<T_Aulas | null> {
  try {
    let filtro: any;

    // Construir el filtro según el rol
    if (rol === RolesSistema.ProfesorPrimaria) {
      filtro = {
        Id_Profesor_Primaria: idProfesor,
      };
    } else if (rol === RolesSistema.Tutor) {
      filtro = {
        Id_Profesor_Secundaria: idProfesor,
      };
    } else {
      throw new Error(`Rol no válido para obtener aula: ${rol}`);
    }

    const resultado = await executeMongoOperation<any[]>(
      instanciaEnUso,
      {
        operation: "find",
        collection: "T_Aulas",
        filter: filtro,
        options: {
          limit: 1,
          projection: {
            _id: 1,
            Nivel: 1,
            Grado: 1,
            Seccion: 1,
            Color: 1,
            Id_Profesor_Primaria: 1,
            Id_Profesor_Secundaria: 1,
          },
        },
      },
      rol
    );

    if (!resultado || resultado.length === 0) {
      return null;
    }

    const aula = resultado[0];

    // Mapear al formato T_Aulas de Prisma
    const aulaFormateada: T_Aulas = {
      Id_Aula: aula._id,
      Nivel: aula.Nivel,
      Grado: aula.Grado,
      Seccion: aula.Seccion,
      Color: aula.Color,
      Id_Profesor_Primaria: aula.Id_Profesor_Primaria || null,
      Id_Profesor_Secundaria: aula.Id_Profesor_Secundaria || null,
    };

    return aulaFormateada;
  } catch (error) {
    console.error("Error obteniendo aula del profesor:", error);
    throw error;
  }
}
