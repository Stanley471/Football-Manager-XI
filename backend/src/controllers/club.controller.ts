import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getClub = async (req: Request, res: Response) => {
  try {
    const club = await prisma.club.findUnique({
      where: { id: (req.params.clubId as string) },
      include: {
        tactic: true,
      }
    });

    if (!club) {
      return res.status(404).json({ error: 'Club not found' });
    }

    res.json(club);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSquad = async (req: Request, res: Response) => {
  try {
    const clubId = (req.params.clubId as string);
    const players: any = await prisma.clubPlayer.findMany({
      where: { clubId },
      include: {
        player: true
      }
    });

    if (!players.length) {
      // Check if club exists
      const club = await prisma.club.findUnique({ where: { id: clubId } });
      if (!club) return res.status(404).json({ error: 'Club not found' });
    }

    res.json(players.map(cp => ({
      ...cp.player,
      shirtNumber: cp.shirtNumber,
      isStarting: cp.isStarting
    })));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const VALID_FORMATIONS = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '5-3-2'];
const VALID_MENTALITIES = ['BALANCED', 'ATTACKING', 'DEFENSIVE'];

export const getTactics = async (req: Request, res: Response) => {
  try {
    const tactic = await prisma.tactic.findUnique({
      where: { clubId: (req.params.clubId as string) }
    });

    if (!tactic) return res.status(404).json({ error: 'Tactics not found for this club' });

    res.json(tactic);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTactics = async (req: Request, res: Response) => {
  try {
    const clubId = req.params.clubId as string;
    const { formation, mentality } = req.body;

    if (!VALID_FORMATIONS.includes(formation)) {
      return res.status(400).json({ error: 'Invalid formation' });
    }
    
    if (!VALID_MENTALITIES.includes(mentality)) {
      return res.status(400).json({ error: 'Invalid mentality' });
    }

    const tactic = await prisma.tactic.upsert({
      where: { clubId },
      update: { formation, mentality },
      create: { clubId, formation, mentality }
    });

    res.json(tactic);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateStartingXI = async (req: Request, res: Response) => {
  try {
    const clubId = req.params.clubId as string;
    const { playerIds } = req.body; // Array of 11 player IDs

    if (!Array.isArray(playerIds) || playerIds.length !== 11) {
      return res.status(400).json({ error: 'Exactly 11 starting players are required' });
    }

    const uniqueIds = new Set(playerIds);
    if (uniqueIds.size !== 11) {
      return res.status(400).json({ error: 'No player can appear twice' });
    }

    // Verify all players belong to club
    const clubPlayers: any = await prisma.clubPlayer.findMany({
      where: {
        clubId,
        playerId: { in: playerIds }
      },
      include: { player: true }
    });

    if (clubPlayers.length !== 11) {
      return res.status(400).json({ error: 'One or more players do not belong to the club' });
    }

    // Verify GK requirements
    const goalkeepers = clubPlayers.filter(cp => cp.player.position === 'GK');
    if (goalkeepers.length !== 1) {
      return res.status(400).json({ error: 'Starting XI must contain exactly 1 Goalkeeper' });
    }

    // Verify formation
    const tactic = await prisma.tactic.findUnique({ where: { clubId } });
    if (!tactic) return res.status(400).json({ error: 'Club tactics not set' });

    const [defReq, midReq, fwdReq] = tactic.formation.split('-').map(Number);
    let defs = 0, mids = 0, fwds = 0;
    if (tactic.formation === '4-2-3-1') { defs = 4; mids = 5; fwds = 1; }
    else {
      defs = defReq;
      mids = midReq;
      fwds = fwdReq;
    }

    const currentDefs = clubPlayers.filter(cp => cp.player.position === 'DEF').length;
    const currentMids = clubPlayers.filter(cp => cp.player.position === 'MID').length;
    const currentFwds = clubPlayers.filter(cp => cp.player.position === 'FWD').length;

    if (currentDefs !== defs || currentMids !== mids || currentFwds !== fwds) {
      return res.status(400).json({ 
        error: `Invalid positions for formation ${tactic.formation}. Expected: ${defs} DEF, ${mids} MID, ${fwds} FWD.`
      });
    }

    // Use transaction to reset all isStarting to false, then set to true for selected
    await prisma.$transaction([
      prisma.clubPlayer.updateMany({
        where: { clubId },
        data: { isStarting: false }
      }),
      prisma.clubPlayer.updateMany({
        where: { clubId, playerId: { in: playerIds } },
        data: { isStarting: true }
      })
    ]);

    res.json({ message: 'Starting XI updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
