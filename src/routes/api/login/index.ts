import { Router } from "express";

import responsableLoginRouter from "./responsable";

const loginRouter = Router();

loginRouter.use("/responsable", responsableLoginRouter);

export default loginRouter;
