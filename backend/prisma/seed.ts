import { PrismaClient, Position, Mentality } from '@prisma/client';

const prisma = new PrismaClient();

const clubsData = [
  {
    id: 'c1000000-0000-0000-0000-000000000001',
    name: 'North London FC',
    shortName: 'NLO',
    budget: 50000000,
  },
  {
    id: 'c2000000-0000-0000-0000-000000000002',
    name: 'Manchester United Blue',
    shortName: 'MUB',
    budget: 80000000,
  },
  {
    id: 'c3000000-0000-0000-0000-000000000003',
    name: 'Merseyside Reds',
    shortName: 'MER',
    budget: 65000000,
  },
  {
    id: 'c4000000-0000-0000-0000-000000000004',
    name: 'West London Blues',
    shortName: 'WLB',
    budget: 70000000,
  }
];

const positions: Position[] = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'GK', 'DEF', 'MID', 'FWD'];

async function main() {
  console.log('Starting seed...');

  for (let i = 0; i < clubsData.length; i++) {
    const clubInfo = clubsData[i];
    
    // Upsert Club
    const club = await prisma.club.upsert({
      where: { id: clubInfo.id },
      update: {},
      create: {
        id: clubInfo.id,
        name: clubInfo.name,
        shortName: clubInfo.shortName,
        budget: clubInfo.budget,
        tactic: {
          create: {
            formation: '4-4-2',
            mentality: Mentality.BALANCED
          }
        }
      }
    });

    // Create 15 players for this club
    for (let p = 0; p < 15; p++) {
      const playerId = `p${i + 1}000000-0000-0000-0000-0000000000${p.toString().padStart(2, '0')}`;
      const pos = positions[p];
      
      await prisma.player.upsert({
        where: { id: playerId },
        update: {},
        create: {
          id: playerId,
          firstName: `Player${p+1}`,
          lastName: `Of${clubInfo.shortName}`,
          position: pos,
          age: 18 + Math.floor(Math.random() * 15),
          rating: 60 + Math.floor(Math.random() * 30),
          marketValue: 1000000 + Math.floor(Math.random() * 9000000),
          clubMemberships: {
            create: {
              clubId: club.id,
              shirtNumber: p + 1
            }
          }
        }
      });
    }
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
