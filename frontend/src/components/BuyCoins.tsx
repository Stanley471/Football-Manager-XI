'use client';
import { useState, useEffect } from 'react';
import { connectWallet, submitPurchaseTransaction } from '@/lib/stellar';

interface Package {
  id: string;
  name: string;
  amount: number;
  priceString: string;
}

interface Config {
  network: string;
  rpcUrl: string;
  contractId: string;
}

interface BuyCoinsProps {
  clubId: string;
  onSuccess: () => void;
}

type UIState = 'IDLE' | 'WALLET_NOT_CONNECTED' | 'READY' | 'SIGNING' | 'SUBMITTING' | 'VERIFYING' | 'SUCCESS';

export default function BuyCoins({ clubId, onSuccess }: BuyCoinsProps) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [loadingPackages, setLoadingPackages] = useState(true);
  
  const [uiState, setUiState] = useState<UIState>('WALLET_NOT_CONNECTED');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');

  useEffect(() => {
    async function loadConfig() {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
        const res = await fetch(`${API_URL}/stellar/packages`);
        if (res.ok) {
          const data = await res.json();
          setPackages(data.data);
          setConfig(data.config);
        }
      } catch (err) {
        console.error('Failed to load packages', err);
      } finally {
        setLoadingPackages(false);
      }
    }
    loadConfig();
    checkWallet();
  }, []);

  const checkWallet = async () => {
    try {
      const state = await connectWallet();
      if (state.connected && state.address) {
        setWalletAddress(state.address);
        setUiState('READY');
      } else {
        setUiState('WALLET_NOT_CONNECTED');
      }
    } catch (e) {
      setUiState('WALLET_NOT_CONNECTED');
    }
  };

  const handleConnect = async () => {
    setError('');
    try {
      const state = await connectWallet();
      if (state.connected && state.address) {
        setWalletAddress(state.address);
        setUiState('READY');
      } else {
        setError('Failed to connect wallet');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting wallet');
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackageId || !config || !walletAddress) return;
    
    try {
      setError('');
      setUiState('SIGNING');
      
      // Since we don't have the real Soroban contract fully deployed locally,
      // and we want to just return a fake hash for dev purposes if Freighter is not installed,
      // wait, the prompt says "Do not create a fake wallet connection".
      // We will call the real Freighter API.
      
      let hash = '';
      try {
        hash = await submitPurchaseTransaction(selectedPackageId, config, walletAddress);
        setUiState('SUBMITTING');
      } catch (err: any) {
        // If Freighter is not available or testnet contract fails, the user wouldn't be able to proceed.
        // For the sake of the exercise, let's catch standard errors.
        throw err;
      }

      setTxHash(hash);
      setUiState('VERIFYING');

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      const verifyRes = await fetch(`${API_URL}/clubs/${clubId}/stellar/purchases/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionHash: hash })
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || 'Verification failed');
      }

      setUiState('SUCCESS');
      onSuccess();

    } catch (err: any) {
      setError(err.message || 'Purchase failed');
      setUiState('READY');
    }
  };

  if (loadingPackages) return <div>Loading store...</div>;

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6 mt-6">
      <h3 className="font-bold text-xl mb-4">Buy FM Coins</h3>
      
      {error && <div className="bg-red-900/50 text-red-200 p-3 rounded mb-4 text-sm">{error}</div>}
      
      {uiState === 'SUCCESS' && (
        <div className="bg-emerald-900/50 text-emerald-200 p-4 rounded mb-4">
          <p className="font-bold">Purchase Successful!</p>
          <p className="text-sm mt-1">Transaction Hash: {txHash}</p>
        </div>
      )}

      {uiState !== 'SUCCESS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {packages.map((pkg) => (
              <div 
                key={pkg.id} 
                className={`border p-4 rounded-lg cursor-pointer transition ${selectedPackageId === pkg.id ? 'border-emerald-500 bg-emerald-900/20' : 'border-zinc-700 hover:border-zinc-500 bg-zinc-950'}`}
                onClick={() => uiState === 'READY' && setSelectedPackageId(pkg.id)}
              >
                <div className="text-xl font-bold text-white mb-1">{pkg.name}</div>
                <div className="text-emerald-400 font-medium">{pkg.amount.toLocaleString()} FM</div>
                <div className="text-zinc-500 text-sm mt-2">{pkg.priceString}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-zinc-800 pt-6">
            <div>
              {walletAddress ? (
                <p className="text-zinc-400 text-sm">
                  Connected: <span className="text-white font-mono">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                </p>
              ) : (
                <p className="text-zinc-500 text-sm">Connect your Stellar wallet to purchase.</p>
              )}
            </div>

            <div>
              {uiState === 'WALLET_NOT_CONNECTED' && (
                <button 
                  onClick={handleConnect}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold transition"
                >
                  Connect Wallet
                </button>
              )}
              
              {uiState !== 'WALLET_NOT_CONNECTED' && (
                <button 
                  onClick={handlePurchase}
                  disabled={!selectedPackageId || uiState !== 'READY'}
                  className={`px-6 py-2 rounded font-bold transition ${(!selectedPackageId || uiState !== 'READY') ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                >
                  {uiState === 'READY' && 'Buy Package'}
                  {uiState === 'SIGNING' && 'Signing...'}
                  {uiState === 'SUBMITTING' && 'Submitting...'}
                  {uiState === 'VERIFYING' && 'Verifying...'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
