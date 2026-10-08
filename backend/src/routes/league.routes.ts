import { Router } from 'express';
import { getLeagueTable } from '../controllers/league.controller';

const router = Router();

router.get('/:season/table', getLeagueTable);

export default router;
