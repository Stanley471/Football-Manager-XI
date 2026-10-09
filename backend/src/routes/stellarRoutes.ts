import { Router } from 'express';
import { verifyPurchase, getPackages } from '../controllers/stellarController';

const router = Router({ mergeParams: true });

router.get('/packages', getPackages);
router.post('/purchases/verify', verifyPurchase);

export default router;
