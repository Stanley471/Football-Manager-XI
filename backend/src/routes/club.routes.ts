import { Router } from 'express';
import { getClub, getSquad, getTactics, updateTactics, updateStartingXI, getFinance, scout, buyPlayer } from '../controllers/club.controller';

const router = Router();

router.get('/:clubId', getClub);
router.get('/:clubId/squad', getSquad);
router.get('/:clubId/tactics', getTactics);
router.put('/:clubId/tactics', updateTactics);
router.put('/:clubId/starting-xi', updateStartingXI);
router.get('/:clubId/finance', getFinance);
router.post('/:clubId/scouting', scout);
router.post('/:clubId/players/:playerId/buy', buyPlayer);

export default router;
