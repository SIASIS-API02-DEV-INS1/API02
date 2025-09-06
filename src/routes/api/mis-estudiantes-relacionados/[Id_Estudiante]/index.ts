import { Router } from "express";
import asistenciasMensualesRouter from "./asistencias-mensuales";

const router = Router();

router.use(asistenciasMensualesRouter);

export default router;
