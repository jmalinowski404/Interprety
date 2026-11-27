import { Router } from 'express';

import { CreateProduct, GetProductById, GetProducts, UpdateProduct, CreateSEODescription } from '../controllers/productController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get("/", GetProducts);
router.get("/:id", GetProductById);

router.get("/:id/seo-description", authenticate, authorize("PRACOWNIK"), CreateSEODescription);
router.post("/", authenticate, authorize("PRACOWNIK"), CreateProduct);
router.patch("/:id", authenticate, authorize("PRACOWNIK"), UpdateProduct);

export default router;
