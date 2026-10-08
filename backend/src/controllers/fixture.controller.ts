import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { simulateMatch } from '../services/matchSimulator';

export const getFixtures = async (req: Request, res: Response) => {
  try {
    const clubId = req.params.clubId as string;
    
    const fixtures = await prisma.fixture.findMany({
      where: {
        OR: [
          { homeClubId: clubId },
          { awayClubId: clubId }
        ]
      },
      include: {
        homeClub: true,
        awayClub: true,
        match: true
      },
      orderBy: { scheduledAt: 'asc' }
    });

    res.json(fixtures);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const simulateFixture = async (req: Request, res: Response) => {
  try {
    const fixtureId = req.params.fixtureId as string;

    const fixture: any = await prisma.fixture.findUnique({
      where: { id: fixtureId },
      include: {
        homeClub: {
          include: { players: { include: { player: true } }, tactic: true }
        },
        awayClub: {
          include: { players: { include: { player: true } }, tactic: true }
        }
      }
    });

    if (!fixture) return res.status(404).json({ error: 'Fixture not found' });
    if (fixture.status === 'PLAYED') return res.status(409).json({ error: 'Fixture already played' });

    const homeStartingXI = fixture.homeClub.players.filter(p => p.isStarting);
    const awayStartingXI = fixture.awayClub.players.filter(p => p.isStarting);

    if (homeStartingXI.length !== 11) {
      return res.status(400).json({ error: 'Home club does not have a valid starting XI' });
    }
    
    if (awayStartingXI.length !== 11) {
      return res.status(400).json({ error: 'Away club does not have a valid starting XI' });
    }

    if (!fixture.homeClub.tactic || !fixture.awayClub.tactic) {
      return res.status(400).json({ error: 'Both clubs must have tactics set' });
    }

    const result = await simulateMatch(fixture, homeStartingXI, awayStartingXI);

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
