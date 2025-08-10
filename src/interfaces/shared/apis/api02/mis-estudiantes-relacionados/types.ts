import { T_Estudiantes } from "@prisma/client";


// Interfaz para la respuesta de estudiantes
export interface EstudianteDelResponsable extends T_Estudiantes {
  Tipo_Relacion: string;
}

export interface MisEstudiantesRelacionadosSuccessResponseAPI02 {
  success: true;
  data: EstudianteDelResponsable[];
  total: number;
}

export interface MisEstudiantesRelacionadosErrorResponseAPI02 {
  success: false;
  message: string;
  errorType: string;
  details?: any;}