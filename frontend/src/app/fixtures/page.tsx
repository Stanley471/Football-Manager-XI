'use client';
import { useEffect, useState } from 'react';
import { getFixtures, simulateFixture, Fixture } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function FixturesPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const CLUB_ID = process.env.NEXT_PUBLIC_CLUB_ID as string;

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const f = await getFixtures(CLUB_ID);
        setFixtures(f);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [CLUB_ID]);

  const handleSimulate = async (id: string) => {
    try {
      setSimulating(true);
      setError('');
      await simulateFixture(id);
      // Redirect to match result
      router.push(`/matches/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setSimulating(false);
    }
  };

  if (loading) return <div>Loading fixtures...</div>;

  const upcoming = fixtures.filter(f => f.status === 'SCHEDULED');
  const completed = fixtures.filter(f => f.status === 'PLAYED').reverse(); // Show most recent first

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold">Fixtures</h2>
      
      {error && <div className="bg-red-900/50 text-red-200 p-4 rounded">{error}</div>}

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-emerald-500 border-b border-zinc-800 pb-2">Upcoming Matches</h3>
        {upcoming.length === 0 ? (
          <p className="text-zinc-500">No upcoming fixtures.</p>
        ) : (
          <div className="grid gap-4">
            {upcoming.map((fixture, idx) => (
              <div key={fixture.id} className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 flex items-center justify-between">
                <div className="text-sm text-zinc-400 w-32">
                  {new Date(fixture.scheduledAt).toLocaleDateString()}
                </div>
                <div className="flex-1 flex justify-center items-center space-x-6 text-lg font-bold">
                  <span className={fixture.homeClubId === CLUB_ID ? 'text-white' : 'text-zinc-400'}>{fixture.homeClub.name}</span>
                  <span className="text-zinc-600 bg-zinc-950 px-3 py-1 rounded">VS</span>
                  <span className={fixture.awayClubId === CLUB_ID ? 'text-white' : 'text-zinc-400'}>{fixture.awayClub.name}</span>
                </div>
                <div className="w-40 text-right">
                  {idx === 0 && (
                    <button 
                      onClick={() => handleSimulate(fixture.id)}
                      disabled={simulating}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded text-sm transition"
                    >
                      {simulating ? 'Simulating...' : 'Simulate Match'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-zinc-400 border-b border-zinc-800 pb-2">Completed Matches</h3>
        {completed.length === 0 ? (
          <p className="text-zinc-500">No matches played yet.</p>
        ) : (
          <div className="grid gap-4">
            {completed.map(fixture => (
              <Link key={fixture.id} href={`/matches/${fixture.id}`} className="block">
                <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 hover:border-zinc-600 transition flex items-center justify-between">
                  <div className="text-sm text-zinc-500 w-32">
                    {new Date(fixture.scheduledAt).toLocaleDateString()}
                  </div>
                  <div className="flex-1 flex justify-center items-center space-x-6 text-lg font-bold">
                    <span className={fixture.homeClubId === CLUB_ID ? 'text-white' : 'text-zinc-400'}>{fixture.homeClub.name}</span>
                    <span className="text-white bg-zinc-800 px-4 py-1 rounded tracking-widest">
                      {fixture.match?.homeScore} - {fixture.match?.awayScore}
                    </span>
                    <span className={fixture.awayClubId === CLUB_ID ? 'text-white' : 'text-zinc-400'}>{fixture.awayClub.name}</span>
                  </div>
                  <div className="w-32 text-right text-emerald-500 text-sm">
                    View Report &rarr;
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
