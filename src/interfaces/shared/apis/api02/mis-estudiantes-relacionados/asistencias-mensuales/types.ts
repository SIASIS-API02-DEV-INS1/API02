import { AsistenciaEscolarDeUnDia } from "../../../../AsistenciasEscolares";

export interface MisEstudianteRelacionadoAsistenciasMensualesSuccessResponse {
  success: true;
  data: {
    Mes: number;
    Asistencias: Record<number, AsistenciaEscolarDeUnDia>;
  };
  total: number;
}

export interface MisEstudianteRelacionadoAsistenciasMensualesErrorAPI02 {
  success: false;
  message: string;
  errorType: string;
  details?: any;
}
