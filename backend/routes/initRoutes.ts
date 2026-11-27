import express, { Router } from 'express';

import { InitProducts } from '../controllers/initController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post(
    "/",
    authenticate,
    authorize("PRACOWNIK"),
    express.text({ type: "text/csv", limit: "5mb" }),
    InitProducts
);

export default router;
