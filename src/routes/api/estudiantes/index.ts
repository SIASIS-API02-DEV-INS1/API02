import { Request, Response, Router } from "express";
import { ErrorResponseAPIBase } from "../../../interfaces/shared/apis/types";
import {
  RequestErrorTypes,
  SystemErrorTypes,
} from "../../../interfaces/shared/errors";
import { NivelEducativo } from "../../../interfaces/shared/NivelEducativo";
import { contarEstudiantesConFiltros } from "../../../../core/databases/queries/RDP03/estudiantes/contarEstudiantesConFiltros";
import { buscarEstudiantesConFiltros } from "../../../../core/databases/queries/RDP03/estudiantes/buscarEstudiantesConFiltros";
import { GetEstudiantesSuccessResponse } from "../../../interfaces/shared/apis/api02/estudiantes/types";

const router = Router();

const CANTIDAD_RESULTADOS_POR_PAGINA_DEFAULT = 8;
const CANTIDAD_RESULTADOS_POR_PAGINA_MAXIMA = 50;

router.get("/", (async (req: Request, res: Response) => {
  try {
    const rdp03EnUso = req.RDP03_INSTANCE;
    const {
      Identificador,
      Nombres,
      Apellidos,
      Nivel,
      Estado,
      Aula,
      Numero_Pagina,
      Cantidad_Resultados_Por_Pagina,
    } = req.query;

    // ------------------------------------------------------------------
    //                    VALIDACIÓN DE "Nivel"
    // ------------------------------------------------------------------
    let nivelFiltro: NivelEducativo | null = null;

    if (typeof Nivel === "string" && Nivel.length > 0 && Nivel !== "T") {
      if (
        Nivel !== NivelEducativo.PRIMARIA &&
        Nivel !== NivelEducativo.SECUNDARIA
      ) {
        return res.status(400).json({
          success: false,
          message: "El parámetro 'Nivel' debe ser 'P', 'S' o 'T'",
          errorType: RequestErrorTypes.INVALID_PARAMETERS,
        } as ErrorResponseAPIBase);
      }
      nivelFiltro = Nivel as NivelEducativo;
    }

    // ------------------------------------------------------------------
    //                    VALIDACIÓN DE "Estado"
    // ------------------------------------------------------------------
    let estadoFiltro: boolean | null = null;

    if (typeof Estado === "string" && Estado.length > 0 && Estado !== "T") {
      if (Estado !== "true" && Estado !== "false") {
        return res.status(400).json({
          success: false,
          message: "El parámetro 'Estado' debe ser 'true', 'false' o 'T'",
          errorType: RequestErrorTypes.INVALID_PARAMETERS,
        } as ErrorResponseAPIBase);
      }
      estadoFiltro = Estado === "true";
    }

    // ------------------------------------------------------------------
    //                    VALIDACIÓN DE "Aula" (Grado,Seccion)
    // ------------------------------------------------------------------
    let grado: number | null = null;
    let seccion: string | null = null;

    if (typeof Aula === "string" && Aula.length > 0) {
      const partes = Aula.split(",");

      if (partes.length !== 2) {
        return res.status(400).json({
          success: false,
          message:
            "El parámetro 'Aula' debe tener el formato 'Grado,Seccion' (ej: T,T | 5,T | T,B)",
          errorType: RequestErrorTypes.INVALID_PARAMETERS,
        } as ErrorResponseAPIBase);
      }

      const [gradoRaw, seccionRaw] = partes;

      if (gradoRaw !== "T") {
        const gradoNum = parseInt(gradoRaw, 10);
        if (isNaN(gradoNum)) {
          return res.status(400).json({
            success: false,
            message: "El grado indicado en el parámetro 'Aula' es inválido",
            errorType: RequestErrorTypes.INVALID_PARAMETERS,
          } as ErrorResponseAPIBase);
        }
        grado = gradoNum;
      }

      if (seccionRaw !== "T") {
        seccion = seccionRaw;
      }
    }

    // ------------------------------------------------------------------
    //                    VALIDACIÓN DE PAGINACIÓN (ambos opcionales)
    // ------------------------------------------------------------------
    let numeroPagina = 1;

    if (typeof Numero_Pagina === "string" && Numero_Pagina.length > 0) {
      if (!/^-?\d+$/.test(Numero_Pagina)) {
        return res.status(400).json({
          success: false,
          message: "El parámetro 'Numero_Pagina' debe ser un número entero",
          errorType: RequestErrorTypes.INVALID_PARAMETERS,
        } as ErrorResponseAPIBase);
      }

      const num = parseInt(Numero_Pagina, 10);

      if (num === 0) {
        return res.status(400).json({
          success: false,
          message:
            "No existe la página 0. La numeración de páginas inicia en 1",
          errorType: RequestErrorTypes.INVALID_PARAMETERS,
        } as ErrorResponseAPIBase);
      }

      if (num < 0) {
        return res.status(400).json({
          success: false,
          message: "El parámetro 'Numero_Pagina' no puede ser negativo",
          errorType: RequestErrorTypes.INVALID_PARAMETERS,
        } as ErrorResponseAPIBase);
      }

      numeroPagina = num;
    }

    let cantidadResultadosPorPagina = CANTIDAD_RESULTADOS_POR_PAGINA_DEFAULT;

    if (
      typeof Cantidad_Resultados_Por_Pagina === "string" &&
      Cantidad_Resultados_Por_Pagina.length > 0
    ) {
      if (!/^-?\d+$/.test(Cantidad_Resultados_Por_Pagina)) {
        return res.status(400).json({
          success: false,
          message:
            "El parámetro 'Cantidad_Resultados_Por_Pagina' debe ser un número entero",
          errorType: RequestErrorTypes.INVALID_PARAMETERS,
        } as ErrorResponseAPIBase);
      }

      const cantidad = parseInt(Cantidad_Resultados_Por_Pagina, 10);

      if (cantidad === 0) {
        return res.status(400).json({
          success: false,
          message:
            "El parámetro 'Cantidad_Resultados_Por_Pagina' no puede ser 0",
          errorType: RequestErrorTypes.INVALID_PARAMETERS,
        } as ErrorResponseAPIBase);
      }

      if (cantidad < 0) {
        return res.status(400).json({
          success: false,
          message:
            "El parámetro 'Cantidad_Resultados_Por_Pagina' no puede ser negativo",
          errorType: RequestErrorTypes.INVALID_PARAMETERS,
        } as ErrorResponseAPIBase);
      }

      if (cantidad > CANTIDAD_RESULTADOS_POR_PAGINA_MAXIMA) {
        return res.status(400).json({
          success: false,
          message: `El parámetro 'Cantidad_Resultados_Por_Pagina' no puede superar ${CANTIDAD_RESULTADOS_POR_PAGINA_MAXIMA}`,
          errorType: RequestErrorTypes.INVALID_PARAMETERS,
        } as ErrorResponseAPIBase);
      }

      cantidadResultadosPorPagina = cantidad;
    }

    // ------------------------------------------------------------------

    const filtros = {
      Identificador:
        typeof Identificador === "string" && Identificador.length > 0
          ? Identificador
          : undefined,
      Nombres:
        typeof Nombres === "string" && Nombres.length > 0 ? Nombres : undefined,
      Apellidos:
        typeof Apellidos === "string" && Apellidos.length > 0
          ? Apellidos
          : undefined,
      Nivel: nivelFiltro,
      Estado: estadoFiltro,
      Grado: grado,
      Seccion: seccion,
    };

    const [totalResultados, estudiantes] = await Promise.all([
      contarEstudiantesConFiltros(filtros, rdp03EnUso),
      buscarEstudiantesConFiltros(
        filtros,
        rdp03EnUso,
        numeroPagina,
        cantidadResultadosPorPagina,
      ),
    ]);

    const totalPaginas = Math.max(
      1,
      Math.ceil(totalResultados / cantidadResultadosPorPagina),
    );

    return res.status(200).json({
      success: true,
      message: "Estudiantes obtenidos exitosamente",
      data: estudiantes,
      paginacion: {
        Pagina_Actual: numeroPagina,
        Cantidad_Resultados_Por_Pagina: cantidadResultadosPorPagina,
        Total_Resultados: totalResultados,
        Total_Paginas: totalPaginas,
      },
    } as GetEstudiantesSuccessResponse);
  } catch (error) {
    console.error("Error al obtener estudiantes:", error);

    return res.status(500).json({
      success: false,
      message: "Error al obtener estudiantes",
      errorType: SystemErrorTypes.UNKNOWN_ERROR,
      details: error,
    } as ErrorResponseAPIBase);
  }
}) as any);

export default router;
