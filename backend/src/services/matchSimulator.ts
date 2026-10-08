import prisma from '../lib/prisma';

export const simulateMatch = async (fixture: any, homeStartingXI: any[], awayStartingXI: any[]) => {
  // 1. Calculate Team Strengths
  const calculateStrength = (xi: any[], tactic: any, isHome: boolean) => {
    const avgRating = xi.reduce((sum, cp) => sum + cp.player.rating, 0) / 11;
    let modifier = 1.0;
    
    if (isHome) modifier += 0.05; // 5% home advantage
    
    if (tactic.mentality === 'ATTACKING') modifier += 0.02;
    else if (tactic.mentality === 'DEFENSIVE') modifier -= 0.02;

    return avgRating * modifier;
  };

  const homeStrength = calculateStrength(homeStartingXI, fixture.homeClub.tactic, true);
  const awayStrength = calculateStrength(awayStartingXI, fixture.awayClub.tactic, false);

  // 2. Generate result using Poisson-style randomness
  // Expected goals (lambda)
  const baseLambda = 1.2;
  const strengthRatio = homeStrength / awayStrength;
  
  // E.g., if strength is 10% higher, expect more goals.
  let homeLambda = baseLambda * Math.pow(strengthRatio, 2);
  let awayLambda = baseLambda * Math.pow(1 / strengthRatio, 2);

  // Mentality adjustments for goals
  if (fixture.homeClub.tactic.mentality === 'ATTACKING') homeLambda *= 1.2;
  if (fixture.homeClub.tactic.mentality === 'DEFENSIVE') awayLambda *= 0.8;
  
  if (fixture.awayClub.tactic.mentality === 'ATTACKING') awayLambda *= 1.2;
  if (fixture.awayClub.tactic.mentality === 'DEFENSIVE') homeLambda *= 0.8;

  const poissonRandom = (lambda: number) => {
    let L = Math.exp(-lambda);
    let p = 1.0;
    let k = 0;
    do {
      k++;
      p *= Math.random();
    } while (p > L);
    return k - 1;
  };

  const homeScore = poissonRandom(homeLambda);
  const awayScore = poissonRandom(awayLambda);

  // 3. Generate match events
  const generateGoalEvents = (score: number, clubId: string, xi: any[]) => {
    const events: any[] = [];
    
    // Weights for scoring: FWD: 5, MID: 3, DEF: 1, GK: 0.1
    const getWeight = (pos: string) => {
      if (pos === 'FWD') return 5;
      if (pos === 'MID') return 3;
      if (pos === 'DEF') return 1;
      return 0.1;
    };

    const weightedPlayers = xi.map(cp => ({
      ...cp,
      weight: getWeight(cp.player.position)
    }));

    const totalWeight = weightedPlayers.reduce((sum, p) => sum + p.weight, 0);

    for (let i = 0; i < score; i++) {
      let r = Math.random() * totalWeight;
      let selectedPlayerId = null;
      for (const p of weightedPlayers) {
        r -= p.weight;
        if (r <= 0) {
          selectedPlayerId = p.playerId;
          break;
        }
      }

      events.push({
        minute: Math.floor(Math.random() * 90) + 1,
        type: 'GOAL',
        playerId: selectedPlayerId,
        clubId: clubId
      });
    }
    return events;
  };

  const eventsData = [
    ...generateGoalEvents(homeScore, fixture.homeClubId, homeStartingXI),
    ...generateGoalEvents(awayScore, fixture.awayClubId, awayStartingXI)
  ];

  // Sort events by minute
  eventsData.sort((a, b) => a.minute - b.minute);

  // 4. Database Transaction
  const match = await prisma.$transaction(async (tx) => {
    const createdMatch = await tx.match.create({
      data: {
        fixtureId: fixture.id,
        homeScore,
        awayScore,
        events: {
          create: eventsData
        }
      },
      include: {
        events: true
      }
    });

    await tx.fixture.update({
      where: { id: fixture.id },
      data: { status: 'PLAYED' }
    });

    // 5. Coin Economy Rewards
    let homeAward = 1000;
    let awayAward = 1000;
    if (homeScore > awayScore) {
      homeAward = 2000;
      awayAward = 500;
    } else if (awayScore > homeScore) {
      homeAward = 500;
      awayAward = 2000;
    }

    // Must import creditCoins - wait, we shouldn't use require inside. Let's assume we import at top.
    // Instead of importing, we can manually implement the Prisma update here or import it.
    // Let's manually do it so we don't worry about import cycles.
    await tx.club.update({
      where: { id: fixture.homeClubId },
      data: {
        balance: { increment: homeAward },
        transactions: {
          create: { amount: homeAward, type: 'MATCH_REWARD', description: 'Match reward', referenceId: createdMatch.id }
        }
      }
    });

    await tx.club.update({
      where: { id: fixture.awayClubId },
      data: {
        balance: { increment: awayAward },
        transactions: {
          create: { amount: awayAward, type: 'MATCH_REWARD', description: 'Match reward', referenceId: createdMatch.id }
        }
      }
    });

    return createdMatch;
  });

  return {
    fixture: { ...fixture, status: 'PLAYED' },
    result: { homeScore, awayScore },
    events: match.events
  };
};
