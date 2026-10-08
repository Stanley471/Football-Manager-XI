import { Router } from 'express';
import { getClub, getSquad, getTactics, updateTactics, updateStartingXI } from '../controllers/club.controller';

const router = Router();

router.get('/:clubId', getClub);
router.get('/:clubId/squad', getSquad);
router.get('/:clubId/tactics', getTactics);
router.put('/:clubId/tactics', updateTactics);
router.put('/:clubId/starting-xi', updateStartingXI);

export default router;
