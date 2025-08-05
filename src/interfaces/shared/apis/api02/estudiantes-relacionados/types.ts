

// Interfaz para la respuesta de estudiantes
export interface EstudianteDelResponsable {
  Id_Estudiante: string;
  Nombres: string;
  Apellidos: string;
  Estado: boolean;
  Id_Aula: string | null;
  Tipo_Relacion: string;
  Google_Drive_Foto_ID?: string | null;
}

export interface MisEstudiantesSuccessResponseAPI02 {
  success: true;
  data: EstudianteDelResponsable[];
  total: number;
}

export interface MisEstudiantesErrorResponseAPI02 {
  success: false;
  message: string;
  errorType: string;
  details?: any;}