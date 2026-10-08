'use client';
import { useEffect, useState } from 'react';
import { getLeagueTable, LeagueRow } from '@/lib/api';

export default function LeaguePage() {
  const [table, setTable] = useState<LeagueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const CLUB_ID = process.env.NEXT_PUBLIC_CLUB_ID as string;

  useEffect(() => {
    async function load() {
      try {
        const t = await getLeagueTable();
        setTable(t);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div>Loading league table...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">League Standings</h2>
      
      {error && <div className="bg-red-900/50 text-red-200 p-4 rounded">{error}</div>}

      <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-zinc-950 text-zinc-400 text-sm font-semibold uppercase tracking-wider">
            <tr>
              <th className="p-4 w-12 text-center">Pos</th>
              <th className="p-4">Club</th>
              <th className="p-4 text-center">P</th>
              <th className="p-4 text-center">W</th>
              <th className="p-4 text-center">D</th>
              <th className="p-4 text-center">L</th>
              <th className="p-4 text-center">GF</th>
              <th className="p-4 text-center">GA</th>
              <th className="p-4 text-center">GD</th>
              <th className="p-4 text-center font-bold">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {table.map((row, index) => (
              <tr 
                key={row.clubId} 
                className={`transition ${row.clubId === CLUB_ID ? 'bg-emerald-900/20' : 'hover:bg-zinc-800/50'}`}
              >
                <td className="p-4 text-center text-zinc-500 font-bold">{index + 1}</td>
                <td className="p-4 font-bold flex items-center space-x-2">
                  <span className={row.clubId === CLUB_ID ? 'text-emerald-400' : 'text-white'}>
                    {row.name}
                  </span>
                  {row.clubId === CLUB_ID && <span className="bg-emerald-600 text-xs px-2 py-0.5 rounded text-white ml-2">YOU</span>}
                </td>
                <td className="p-4 text-center text-zinc-300">{row.played}</td>
                <td className="p-4 text-center text-zinc-300">{row.wins}</td>
                <td className="p-4 text-center text-zinc-300">{row.draws}</td>
                <td className="p-4 text-center text-zinc-300">{row.losses}</td>
                <td className="p-4 text-center text-zinc-400">{row.goalsFor}</td>
                <td className="p-4 text-center text-zinc-400">{row.goalsAgainst}</td>
                <td className="p-4 text-center text-zinc-400">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                <td className="p-4 text-center font-bold text-white text-lg">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
