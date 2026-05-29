import { Router, type IRouter } from "express";
import healthRouter from "./health";
import conversationsRouter from "./conversations";
import messagesRouter from "./messages";
import filesRouter from "./files";
import settingsRouter from "./settings";
import toolsRouter from "./tools";

const router: IRouter = Router();

router.use(healthRouter);
router.use(conversationsRouter);
router.use(messagesRouter);
router.use(filesRouter);
router.use(settingsRouter);
router.use(toolsRouter);

export default router;
