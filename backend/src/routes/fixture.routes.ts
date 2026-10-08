import { Router } from 'express';
import { getFixtures, simulateFixture } from '../controllers/fixture.controller';

const router = Router();

router.get('/clubs/:clubId/fixtures', getFixtures);
router.post('/fixtures/:fixtureId/simulate', simulateFixture);

export default router;
