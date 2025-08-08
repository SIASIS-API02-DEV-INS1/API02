
import { T_Aulas } from "@prisma/client";


export type Aula_Primaria = Omit<T_Aulas , "Id_Profesor_Secundaria"> & {Id_Profesor_Primaria: string}
export type Aula_Secundaria = Omit<T_Aulas , "Id_Profesor_Primaria"> & {Id_Profesor_Secundaria: string}