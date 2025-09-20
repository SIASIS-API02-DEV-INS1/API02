import { AsistenciaEscolarDeUnDia } from "../../../../AsistenciasEscolares";
import { SuccessResponseAPIBase } from "../../../types";



export interface GetAsistenciasMensualesDeUnAulaSuccessResponse extends SuccessResponseAPIBase{
    data: {
        Mes: number;            //Id Estudiante, {Numero Dia: AsistenciaEscolarDeUnDia | null}
        Asistencias_Escolares: Record<string, Record<number, AsistenciaEscolarDeUnDia | null>>;
      };
}

