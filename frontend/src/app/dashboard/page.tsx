'use client';
import { useEffect, useState } from 'react';
import { getClub, getSquad, getFixtures, getLeagueTable, Club, Player, Fixture, LeagueRow } from '@/lib/api';
import Link from 'next/link';

export default function Dashboard() {
  const [club, setClub] = useState<Club | null>(null);
  const [squad, setSquad] = useState<Player[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [league, setLeague] = useState<LeagueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const CLUB_ID = process.env.NEXT_PUBLIC_CLUB_ID as string;

  useEffect(() => {
    async function load() {
      try {
        const [c, s, f, l] = await Promise.all([
          getClub(CLUB_ID),
          getSquad(CLUB_ID),
          getFixtures(CLUB_ID),
          getLeagueTable()
        ]);
        setClub(c);
        setSquad(s);
        setFixtures(f);
        setLeague(l);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [CLUB_ID]);

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!club) return null;

  const nextFixture = fixtures.find(f => f.status === 'SCHEDULED');
  const recentFixtures = fixtures.filter(f => f.status === 'PLAYED').reverse();
  const recentResult = recentFixtures.length > 0 ? recentFixtures[0] : null;
  const posIndex = league.findIndex(r => r.clubId === club.id);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">{club.name} Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
          <h3 className="text-zinc-400 text-sm font-semibold uppercase mb-2">Club Balance</h3>
          <p className="text-2xl font-bold">{club.balance.toLocaleString()} FM</p>
        </div>
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
          <h3 className="text-zinc-400 text-sm font-semibold uppercase mb-2">Squad Size</h3>
          <p className="text-2xl font-bold">{squad.length} Players</p>
        </div>
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
          <h3 className="text-zinc-400 text-sm font-semibold uppercase mb-2">Formation</h3>
          <p className="text-2xl font-bold">{club.tactic?.formation || 'Not Set'}</p>
        </div>
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
          <h3 className="text-zinc-400 text-sm font-semibold uppercase mb-2">League Position</h3>
          <p className="text-2xl font-bold">{posIndex >= 0 ? posIndex + 1 : '-'} / {league.length || '-'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
          <h3 className="text-lg font-bold mb-4">Next Fixture</h3>
          {nextFixture ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-zinc-950 p-4 rounded-md">
                <span className={nextFixture.homeClubId === club.id ? 'font-bold' : ''}>
                  {nextFixture.homeClub.name}
                </span>
                <span className="text-zinc-500 font-mono">v</span>
                <span className={nextFixture.awayClubId === club.id ? 'font-bold' : ''}>
                  {nextFixture.awayClub.name}
                </span>
              </div>
              <Link 
                href="/fixtures" 
                className="block text-center w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded transition"
              >
                Go to Fixtures to Simulate
              </Link>
            </div>
          ) : (
            <p className="text-zinc-400">No upcoming fixtures.</p>
          )}
        </div>

        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
          <h3 className="text-lg font-bold mb-4">Recent Result</h3>
          {recentResult ? (
            <div className="bg-zinc-950 p-4 rounded-md space-y-2">
               <div className="flex items-center justify-between">
                <span>{recentResult.homeClub.name}</span>
                <span className="font-mono text-xl">{recentResult.match?.homeScore} - {recentResult.match?.awayScore}</span>
                <span>{recentResult.awayClub.name}</span>
              </div>
              <Link href={`/matches/${recentResult.id}`} className="text-emerald-500 text-sm hover:underline block text-center mt-2">
                View Match Report
              </Link>
            </div>
          ) : (
            <p className="text-zinc-400">No recent results.</p>
          )}
        </div>
      </div>
    </div>
  );
}
