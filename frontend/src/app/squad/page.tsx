'use client';
import { useEffect, useState } from 'react';
import { getSquad, updateStartingXI, Player } from '@/lib/api';

export default function SquadPage() {
  const [squad, setSquad] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const CLUB_ID = process.env.NEXT_PUBLIC_CLUB_ID as string;

  useEffect(() => {
    async function load() {
      try {
        const s = await getSquad(CLUB_ID);
        setSquad(s);
        const starting = s.filter(p => p.isStarting).map(p => p.id);
        setSelectedIds(new Set(starting));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [CLUB_ID]);

  const togglePlayer = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      await updateStartingXI(CLUB_ID, Array.from(selectedIds));
      const s = await getSquad(CLUB_ID);
      setSquad(s);
      alert('Starting XI saved successfully!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading squad...</div>;

  const posColor = (pos: string) => {
    switch(pos) {
      case 'GK': return 'text-yellow-500';
      case 'DEF': return 'text-blue-500';
      case 'MID': return 'text-green-500';
      case 'FWD': return 'text-red-500';
      default: return 'text-zinc-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">First Team Squad</h2>
        <div className="flex items-center space-x-4">
          <span className="text-zinc-400">Selected: {selectedIds.size}/11</span>
          <button 
            onClick={handleSave} 
            disabled={saving || selectedIds.size !== 11}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded transition"
          >
            {saving ? 'Saving...' : 'Save Starting XI'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-900/50 text-red-200 p-4 rounded">{error}</div>}

      <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-zinc-950 text-zinc-400 text-sm">
            <tr>
              <th className="p-4 w-12">XI</th>
              <th className="p-4">No.</th>
              <th className="p-4">Player</th>
              <th className="p-4">Position</th>
              <th className="p-4">Rating</th>
              <th className="p-4">Age</th>
              <th className="p-4">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {squad.map(player => (
              <tr key={player.id} className="hover:bg-zinc-800/50 transition">
                <td className="p-4">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(player.id)}
                    onChange={() => togglePlayer(player.id)}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </td>
                <td className="p-4 text-zinc-400">{player.shirtNumber}</td>
                <td className="p-4 font-semibold">{player.firstName} {player.lastName}</td>
                <td className={`p-4 font-bold ${posColor(player.position)}`}>{player.position}</td>
                <td className="p-4">{player.rating}</td>
                <td className="p-4 text-zinc-400">{player.age}</td>
                <td className="p-4 text-emerald-500">${(player.marketValue / 1000000).toFixed(1)}M</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
