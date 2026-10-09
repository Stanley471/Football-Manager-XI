import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const clubsData = [
  {
    id: 'c1000000-0000-0000-0000-000000000001',
    name: 'North London FC',
    shortName: 'NLO',
    balance: 100000,
  },
  {
    id: 'c2000000-0000-0000-0000-000000000002',
    name: 'Manchester United Blue',
    shortName: 'MUB',
    balance: 100000,
  },
  {
    id: 'c3000000-0000-0000-0000-000000000003',
    name: 'Merseyside Reds',
    shortName: 'MER',
    balance: 100000,
  },
  {
    id: 'c4000000-0000-0000-0000-000000000004',
    name: 'West London Blues',
    shortName: 'WLB',
    balance: 100000,
  }
];

const positions: string[] = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'GK', 'DEF', 'MID', 'FWD'];

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
        balance: clubInfo.balance,
        transactions: {
          create: {
            amount: clubInfo.balance,
            type: 'STARTING_BALANCE',
            description: 'Initial FM Coin grant'
          }
        },
        tactic: {
          create: {
            formation: '4-4-2',
            mentality: 'BALANCED'
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

  // Create some fixtures
  console.log('Creating fixtures...');
  await prisma.fixture.upsert({
    where: { id: 'f1000000-0000-0000-0000-000000000001' },
    update: { status: 'SCHEDULED' },
    create: {
      id: 'f1000000-0000-0000-0000-000000000001',
      homeClubId: clubsData[0].id,
      awayClubId: clubsData[1].id,
      scheduledAt: new Date(Date.now() + 86400000), // Tomorrow
      status: 'SCHEDULED',
      season: '2026/2027'
    }
  });

  await prisma.fixture.upsert({
    where: { id: 'f2000000-0000-0000-0000-000000000002' },
    update: { status: 'SCHEDULED' },
    create: {
      id: 'f2000000-0000-0000-0000-000000000002',
      homeClubId: clubsData[2].id,
      awayClubId: clubsData[3].id,
      scheduledAt: new Date(Date.now() + 86400000 * 2),
      status: 'SCHEDULED',
      season: '2026/2027'
    }
  });

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
