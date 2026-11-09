import { Router, Request, Response, NextFunction } from 'express';

import { GetProducts } from '../controllers/productController';

const router = Router();

router.get("/", GetProducts);

export default router;