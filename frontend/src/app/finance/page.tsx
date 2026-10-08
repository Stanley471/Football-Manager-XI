'use client';
import { useEffect, useState } from 'react';
import { getFinance, FinanceSummary } from '@/lib/api';

export default function FinancePage() {
  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const CLUB_ID = process.env.NEXT_PUBLIC_CLUB_ID as string;

  useEffect(() => {
    async function load() {
      try {
        const data = await getFinance(CLUB_ID);
        setFinance(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [CLUB_ID]);

  if (loading) return <div>Loading finance...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Club Finance</h2>
      
      {error && <div className="bg-red-900/50 text-red-200 p-4 rounded">{error}</div>}

      {finance && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-emerald-900/20 p-6 rounded-lg border border-emerald-800">
              <h3 className="text-emerald-400 text-sm font-semibold uppercase mb-2">Current Balance</h3>
              <p className="text-3xl font-bold text-white">{finance.balance.toLocaleString()} FM</p>
            </div>
            <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
              <h3 className="text-zinc-400 text-sm font-semibold uppercase mb-2">Total Income</h3>
              <p className="text-xl font-bold text-emerald-500">+{finance.income.toLocaleString()} FM</p>
            </div>
            <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
              <h3 className="text-zinc-400 text-sm font-semibold uppercase mb-2">Total Spending</h3>
              <p className="text-xl font-bold text-red-500">-{finance.spending.toLocaleString()} FM</p>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
            <div className="p-4 border-b border-zinc-800">
              <h3 className="font-bold text-lg">Transaction Ledger</h3>
            </div>
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-zinc-950 text-zinc-400 text-sm font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Type</th>
                  <th className="p-4 text-right">Amount (FM)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {finance.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-zinc-500">No transactions recorded.</td>
                  </tr>
                ) : (
                  finance.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-zinc-800/50 transition">
                      <td className="p-4 text-sm text-zinc-400">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4 font-medium">{tx.description}</td>
                      <td className="p-4">
                        <span className="bg-zinc-950 text-xs px-2 py-1 rounded text-zinc-400 border border-zinc-800">
                          {tx.type}
                        </span>
                      </td>
                      <td className={`p-4 text-right font-bold ${tx.amount > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
