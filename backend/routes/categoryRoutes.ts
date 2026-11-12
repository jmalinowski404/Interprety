import { Router, Request, Response, NextFunction } from 'express';

import { GetCategories } from '../controllers/categoryController';

const router = Router();

router.get("/", GetCategories)

export default router;