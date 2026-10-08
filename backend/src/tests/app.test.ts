import { test, describe, before } from 'node:test';
import * as assert from 'node:assert';
import request from 'supertest';
import app from '../server';
import prisma from '../lib/prisma';

describe('Football Manager XI MVP API', () => {
  let homeClubId: string;
  let awayClubId: string;
  let homePlayers: any[];
  let fixtureId: string;

  before(async () => {
    // Seed test data using existing prisma setup
    const clubs = await prisma.club.findMany();
    homeClubId = clubs[0].id;
    awayClubId = clubs[1].id;

    homePlayers = await prisma.clubPlayer.findMany({ where: { clubId: homeClubId }, include: { player: true } });
    const fixtures = await prisma.fixture.findMany({ where: { status: 'SCHEDULED' } });
    fixtureId = fixtures[0].id;
  });

  test('Valid starting XI logic', async () => {
    const tactic = await prisma.tactic.findUnique({ where: { clubId: homeClubId } }); // 4-4-2
    // Need 1 GK, 4 DEF, 4 MID, 2 FWD
    const gks = homePlayers.filter(p => p.player.position === 'GK');
    const defs = homePlayers.filter(p => p.player.position === 'DEF');
    const mids = homePlayers.filter(p => p.player.position === 'MID');
    const fwds = homePlayers.filter(p => p.player.position === 'FWD');

    const validXI = [
      gks[0].playerId,
      defs[0].playerId, defs[1].playerId, defs[2].playerId, defs[3].playerId,
      mids[0].playerId, mids[1].playerId, mids[2].playerId, mids[3].playerId,
      fwds[0].playerId, fwds[1].playerId
    ];

    const res = await request(app).put(`/api/v1/clubs/${homeClubId}/starting-xi`).send({ playerIds: validXI });
    assert.strictEqual(res.status, 200);
  });

  test('Invalid starting XI logic (duplicate player)', async () => {
    const validXI = [
      homePlayers[0].playerId, homePlayers[0].playerId, homePlayers[2].playerId, homePlayers[3].playerId,
      homePlayers[4].playerId, homePlayers[5].playerId, homePlayers[6].playerId, homePlayers[7].playerId,
      homePlayers[8].playerId, homePlayers[9].playerId, homePlayers[10].playerId
    ];
    const res = await request(app).put(`/api/v1/clubs/${homeClubId}/starting-xi`).send({ playerIds: validXI });
    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /No player can appear twice/);
  });

  test('Invalid starting XI logic (bad formation)', async () => {
    // Try sending 5 DEFs for a 4-4-2 formation
    const defs = homePlayers.filter(p => p.player.position === 'DEF');
    const gks = homePlayers.filter(p => p.player.position === 'GK');
    const mids = homePlayers.filter(p => p.player.position === 'MID');
    const fwds = homePlayers.filter(p => p.player.position === 'FWD');

    const invalidXI = [
      gks[0].playerId,
      defs[0].playerId, defs[1].playerId, defs[2].playerId, defs[3].playerId, defs[4].playerId,
      mids[0].playerId, mids[1].playerId, mids[2].playerId,
      fwds[0].playerId, fwds[1].playerId
    ];

    const res = await request(app).put(`/api/v1/clubs/${homeClubId}/starting-xi`).send({ playerIds: invalidXI });
    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /Invalid positions for formation/);
  });

  test('Formation validation', async () => {
    let res = await request(app).put(`/api/v1/clubs/${homeClubId}/tactics`).send({ formation: '9-9-9', mentality: 'ATTACKING' });
    assert.strictEqual(res.status, 400);

    res = await request(app).put(`/api/v1/clubs/${homeClubId}/tactics`).send({ formation: '4-3-3', mentality: 'ATTACKING' });
    assert.strictEqual(res.status, 200);

    // reset to 4-4-2
    await request(app).put(`/api/v1/clubs/${homeClubId}/tactics`).send({ formation: '4-4-2', mentality: 'BALANCED' });
  });

  test('Simulation creates valid scores, events and cannot be simulated twice', async () => {
    // We need both teams to have a valid starting XI to simulate.
    const awayPlayers = await prisma.clubPlayer.findMany({ where: { clubId: awayClubId }, include: { player: true } });
    const agks = awayPlayers.filter(p => p.player.position === 'GK');
    const adefs = awayPlayers.filter(p => p.player.position === 'DEF');
    const amids = awayPlayers.filter(p => p.player.position === 'MID');
    const afwds = awayPlayers.filter(p => p.player.position === 'FWD');

    const awayXI = [
      agks[0].playerId,
      adefs[0].playerId, adefs[1].playerId, adefs[2].playerId, adefs[3].playerId,
      amids[0].playerId, amids[1].playerId, amids[2].playerId, amids[3].playerId,
      afwds[0].playerId, afwds[1].playerId
    ];
    await request(app).put(`/api/v1/clubs/${awayClubId}/starting-xi`).send({ playerIds: awayXI });

    // Ensure home team has a valid XI
    const gks = homePlayers.filter(p => p.player.position === 'GK');
    const defs = homePlayers.filter(p => p.player.position === 'DEF');
    const mids = homePlayers.filter(p => p.player.position === 'MID');
    const fwds = homePlayers.filter(p => p.player.position === 'FWD');
    const validXI = [
      gks[0].playerId,
      defs[0].playerId, defs[1].playerId, defs[2].playerId, defs[3].playerId,
      mids[0].playerId, mids[1].playerId, mids[2].playerId, mids[3].playerId,
      fwds[0].playerId, fwds[1].playerId
    ];
    await request(app).put(`/api/v1/clubs/${homeClubId}/starting-xi`).send({ playerIds: validXI });


    const res = await request(app).post(`/api/v1/fixtures/${fixtureId}/simulate`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.result);
    assert.ok(Array.isArray(res.body.events));
    
    // Test Double Simulation
    const res2 = await request(app).post(`/api/v1/fixtures/${fixtureId}/simulate`);
    assert.strictEqual(res2.status, 409);
    assert.match(res2.body.error, /Fixture already played/);
  });

  test('League table calculation', async () => {
    const res = await request(app).get('/api/v1/leagues/2026%2F2027/table');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length > 0);
    assert.ok(res.body[0].points !== undefined);
  });
});
