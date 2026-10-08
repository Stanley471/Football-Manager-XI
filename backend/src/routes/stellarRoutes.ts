import { Router } from 'express';
import { verifyPurchase } from '../controllers/stellarController';

const router = Router({ mergeParams: true });

router.post('/purchases/verify', verifyPurchase);

export default router;
