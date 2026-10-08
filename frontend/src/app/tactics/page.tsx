'use client';
import { useEffect, useState } from 'react';
import { getTactics, updateTactics, Tactic } from '@/lib/api';

const FORMATIONS = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '5-3-2'];
const MENTALITIES = ['DEFENSIVE', 'BALANCED', 'ATTACKING'];

export default function TacticsPage() {
  const [tactic, setTactic] = useState<Tactic | null>(null);
  const [formation, setFormation] = useState('');
  const [mentality, setMentality] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const CLUB_ID = process.env.NEXT_PUBLIC_CLUB_ID as string;

  useEffect(() => {
    async function load() {
      try {
        const t = await getTactics(CLUB_ID);
        setTactic(t);
        setFormation(t.formation);
        setMentality(t.mentality);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [CLUB_ID]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      const t = await updateTactics(CLUB_ID, { formation, mentality });
      setTactic(t);
      alert('Tactics saved successfully!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading tactics...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-3xl font-bold">Tactical Setup</h2>
      
      {error && <div className="bg-red-900/50 text-red-200 p-4 rounded">{error}</div>}

      <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-zinc-400 uppercase mb-2">Formation</label>
          <div className="grid grid-cols-3 gap-3">
            {FORMATIONS.map(f => (
              <button
                key={f}
                onClick={() => setFormation(f)}
                className={`py-3 px-4 rounded border text-center font-bold transition ${
                  formation === f 
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-500' 
                  : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-zinc-400 uppercase mb-2">Mentality</label>
          <div className="grid grid-cols-3 gap-3">
            {MENTALITIES.map(m => (
              <button
                key={m}
                onClick={() => setMentality(m)}
                className={`py-3 px-4 rounded border text-center font-bold transition ${
                  mentality === m 
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-500' 
                  : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-800">
          <button 
            onClick={handleSave} 
            disabled={saving || (formation === tactic?.formation && mentality === tactic?.mentality)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded transition"
          >
            {saving ? 'Saving...' : 'Save Tactics'}
          </button>
        </div>
      </div>
    </div>
  );
}
