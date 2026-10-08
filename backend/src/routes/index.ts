import { Router } from 'express';
import clubRoutes from './club.routes';
import fixtureRoutes from './fixture.routes';
import leagueRoutes from './league.routes';

const router = Router();

router.use('/clubs', clubRoutes);
router.use('/', fixtureRoutes); // contains /clubs/:clubId/fixtures and /fixtures/:id/simulate
router.use('/leagues', leagueRoutes);

export default router;
