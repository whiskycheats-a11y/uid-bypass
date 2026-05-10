import { Router, type IRouter } from "express";
import healthRouter from "./health";
import uidRouter from "./uid";
import authRouter from "./auth";
import usersRouter from "./users";
import resellerRouter from "./reseller";
import settingsRouter from "./settings";
import creditsRouter from "./credits";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/uid", uidRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/reseller", resellerRouter);
router.use("/settings", settingsRouter);
router.use("/credits", creditsRouter);
router.use("/payments", paymentsRouter);

export default router;
