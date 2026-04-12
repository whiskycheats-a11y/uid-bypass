import { Router, type IRouter } from "express";
import healthRouter from "./health";
import uidRouter from "./uid";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/uid", uidRouter);

export default router;
