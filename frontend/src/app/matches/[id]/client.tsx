'use client';
import { useEffect, useState } from 'react';
import { getFixtures, Fixture } from '@/lib/api';
import Link from 'next/link';

export default function MatchResultClient({ id }: { id: string }) {
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const CLUB_ID = process.env.NEXT_PUBLIC_CLUB_ID as string;

  useEffect(() => {
    async function load() {
      try {
        const f = await getFixtures(CLUB_ID);
        const match = f.find(x => x.id === id);
        if (!match) throw new Error('Match not found');
        setFixture(match);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, CLUB_ID]);

  if (loading) return <div>Loading match result...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!fixture || !fixture.match) return <div>Match details unavailable.</div>;

  const match = fixture.match;
  const events = match.events || [];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <Link href="/fixtures" className="text-emerald-500 hover:underline mb-4 inline-block">&larr; Back to Fixtures</Link>
      
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {/* Scoreboard */}
        <div className="bg-zinc-950 p-8 text-center flex flex-col items-center justify-center border-b border-zinc-800">
          <div className="text-sm text-zinc-500 mb-6 uppercase tracking-widest font-semibold">
            Full Time
          </div>
          <div className="flex justify-center items-center w-full max-w-lg space-x-4">
            <div className="flex-1 text-right text-2xl font-bold">{fixture.homeClub.name}</div>
            <div className="text-5xl font-black bg-zinc-800 px-6 py-2 rounded-lg text-white tracking-widest">
              {match.homeScore} - {match.awayScore}
            </div>
            <div className="flex-1 text-left text-2xl font-bold">{fixture.awayClub.name}</div>
          </div>
          <div className="mt-6 text-sm text-zinc-500">
            {new Date(fixture.scheduledAt).toLocaleDateString()}
          </div>
        </div>

        {/* Timeline */}
        <div className="p-8">
          <h3 className="text-xl font-bold mb-6 text-center border-b border-zinc-800 pb-4">Match Events</h3>
          {events.length === 0 ? (
            <p className="text-center text-zinc-500 py-4">No major events recorded.</p>
          ) : (
            <div className="space-y-4 max-w-md mx-auto">
              {events.map((e, idx) => {
                const isHome = e.clubId === fixture.homeClubId;
                return (
                  <div key={idx} className="flex items-center">
                    {/* Home Event */}
                    <div className="w-1/2 text-right pr-4">
                      {isHome && (
                        <div className="flex justify-end items-center space-x-2">
                          <span className="font-semibold text-zinc-300">Player {e.playerId?.substring(0, 4)}</span>
                          {e.type === 'GOAL' && <span className="text-lg">⚽</span>}
                          {e.type === 'YELLOW_CARD' && <span className="text-yellow-500">🟨</span>}
                          {e.type === 'RED_CARD' && <span className="text-red-500">🟥</span>}
                        </div>
                      )}
                    </div>
                    
                    {/* Minute */}
                    <div className="w-12 text-center font-bold text-zinc-500 bg-zinc-950 py-1 rounded">
                      {e.minute}&apos;
                    </div>
                    
                    {/* Away Event */}
                    <div className="w-1/2 pl-4">
                      {!isHome && (
                        <div className="flex items-center space-x-2">
                          {e.type === 'GOAL' && <span className="text-lg">⚽</span>}
                          {e.type === 'YELLOW_CARD' && <span className="text-yellow-500">🟨</span>}
                          {e.type === 'RED_CARD' && <span className="text-red-500">🟥</span>}
                          <span className="font-semibold text-zinc-300">Player {e.playerId?.substring(0, 4)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
