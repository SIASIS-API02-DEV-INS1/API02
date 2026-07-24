import { T_Aulas, T_Estudiantes } from "@prisma/client";
import { Genero } from "../../../Genero";
import { SuccessResponseAPIBase } from "../../types";
import { NivelEducativo } from "../../../NivelEducativo";

export type EstudiantesListItem = Pick<
  T_Estudiantes,
  "Id_Estudiante" | "Nombres" | "Apellidos" | "Estado" | "Google_Drive_Foto_ID"
> & {
  Aula: Omit<T_Aulas, "Id_Profesor_Primaria" | "Id_Profesor_Secundaria"> | null;
};

// --------------------------------------------------------------------------------------
//                                REGISTRO DE ESTUDIANTES
// --------------------------------------------------------------------------------------

export interface RegistroEstudianteRequestBody {
  Id_Profesor_Primaria: string;
  Nombres: string;
  Apellidos: string;
  Genero: Genero;
  Celular: string;
  Id_Aula?: string;
}

export interface RegistroEstudianteSuccessResponse extends SuccessResponseAPIBase {
  data: RegistroEstudianteRequestBody;
}

// --------------------------------------------------------------------------------------
//                               CONSULTAS DE ESTUDIANTES
// --------------------------------------------------------------------------------------

export type AulaQueryParamType = `${string},${string}`;

export interface GetEstudiantesAPI01QueryParams {
  Identificador?: string;
  Nombres?: string;
  Apellidos?: string;
  Nivel?: NivelEducativo | "T";
  Estado?: boolean;
  Aula?: AulaQueryParamType;
  Numero_Pagina?: number;
  Cantidad_Resultados_Por_Pagina?: number;
}

export interface PaginacionInfo {
  Pagina_Actual: number;
  Cantidad_Resultados_Por_Pagina: number;
  Total_Resultados: number;
  Total_Paginas: number;
}

export interface GetEstudiantesSuccessResponse extends SuccessResponseAPIBase {
  data: EstudiantesListItem[];
  paginacion: PaginacionInfo;
}

export interface GetEstudianteSuccessResponse extends SuccessResponseAPIBase {
  data: EstudiantesListItem;
}

// --------------------------------------------------------------------------------------
//                               ACTUALIZACION DE ESTUDIANTES
// --------------------------------------------------------------------------------------

export interface UpdateEstudianteRequestBody {
  Nombres?: string;
  Apellidos?: string;
  Genero?: Genero;
  Celular?: string;
  Correo_Electronico?: string;
}

export interface UpdateEstudianteSuccessResponse extends SuccessResponseAPIBase {
  data: {
    Id_Estudiante: string;
    Nombres: string;
    Apellidos: string;
    Estado: boolean;
  };
}

export interface UpdateEstadoProfesorPrimariaRequestBody {
  Estado: boolean;
}

export interface ActualizarEstadoEstudianteSuccessResponse extends SuccessResponseAPIBase {
  data: {
    Id_Estudiante: string;
    Nombres: string;
    Apellidos: string;
    Estado: boolean;
  };
}

export interface ActualizarContraseñaProfesorPrimariaRequestBody {
  NuevaContraseña: string;
}

export interface ActualizarContraseñaProfesorPrimariaSuccessResponse extends SuccessResponseAPIBase {}
