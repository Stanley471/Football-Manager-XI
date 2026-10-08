import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getLeagueTable = async (req: Request, res: Response) => {
  try {
    const season = req.params.season as string;

    const fixtures: any = await prisma.fixture.findMany({
      where: { season, status: 'PLAYED' },
      include: { match: true }
    });

    const clubs = await prisma.club.findMany();
    
    const table: Record<string, any> = {};
    
    clubs.forEach(club => {
      table[club.id] = {
        clubId: club.id,
        name: club.name,
        shortName: club.shortName,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0
      };
    });

    fixtures.forEach(fixture => {
      const match = fixture.match;
      if (!match) return;

      const home = table[fixture.homeClubId];
      const away = table[fixture.awayClubId];

      if (!home || !away) return;

      home.played += 1;
      away.played += 1;

      home.goalsFor += match.homeScore;
      home.goalsAgainst += match.awayScore;
      
      away.goalsFor += match.awayScore;
      away.goalsAgainst += match.homeScore;

      if (match.homeScore > match.awayScore) {
        home.wins += 1;
        home.points += 3;
        away.losses += 1;
      } else if (match.homeScore < match.awayScore) {
        away.wins += 1;
        away.points += 3;
        home.losses += 1;
      } else {
        home.draws += 1;
        home.points += 1;
        away.draws += 1;
        away.points += 1;
      }
    });

    const standings = Object.values(table).map(club => {
      club.goalDifference = club.goalsFor - club.goalsAgainst;
      return club;
    });

    standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

    res.json(standings);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
