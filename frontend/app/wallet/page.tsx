'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { walletApi, handleApiError } from '@/lib/api';
import { type Wallet, type Transaction } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet as WalletIcon, ArrowUpCircle, ArrowDownCircle, RotateCcw } from 'lucide-react';

export default function WalletPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [topupLoading, setTopupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || user?.role !== 'driver') {
      router.push(user?.role === 'admin' ? '/admin' : user?.role === 'operator' ? '/operator' : '/auth/login');
    }
  }, [isAuthenticated, isLoading, user, router]);

  const loadWallet = async () => {
    try {
      setLoading(true);
      const [walletData, txData] = await Promise.all([
        walletApi.balance(),
        walletApi.transactions(),
      ]);
      setWallet(walletData);
      setTransactions(txData);
    } catch (err) {
      setError(handleApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || isLoading || user?.role !== 'driver') return;
    loadWallet();
  }, [isAuthenticated, isLoading, user]);

  const handleTopup = async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }
    try {
      setTopupLoading(true);
      setError(null);
      setSuccess(null);
      const updated = await walletApi.topup(parsed);
      setWallet(updated);
      setSuccess(`${parsed.toFixed(2)} TL added to your wallet.`);
      setAmount('');
      // Refresh transactions
      const txData = await walletApi.transactions();
      setTransactions(txData);
    } catch (err) {
      setError(handleApiError(err).message);
    } finally {
      setTopupLoading(false);
    }
  };

  const txIcon = (type: string) => {
    switch (type) {
      case 'topup': return <ArrowUpCircle className="h-5 w-5 text-green-400" />;
      case 'charge': return <ArrowDownCircle className="h-5 w-5 text-red-400" />;
      case 'refund': return <RotateCcw className="h-5 w-5 text-blue-400" />;
      default: return <WalletIcon className="h-5 w-5 text-[#A7BEB5]" />;
    }
  };

  const txLabel = (type: string) => {
    switch (type) {
      case 'topup': return 'Top Up';
      case 'charge': return 'Charging Payment';
      case 'refund': return 'Refund';
      default: return type;
    }
  };

  const formatDate = (value: string | undefined) => {
    if (!value) return 'Unknown Date';
    return new Date(value).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] flex items-center justify-center">
        <p className="text-lg">Loading wallet...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] py-10">
      <div className="mx-auto max-w-2xl px-4">
        <p className="text-sm uppercase tracking-[0.24em] text-[#70B4A6]">Your wallet</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Balance & Transactions</h1>

        {error && (
          <Alert className="mt-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <div className="mt-6 rounded-[28px] border border-[#4C736F] bg-[#062C24] p-4 text-center text-[#6BC0A4]">
            {success}
          </div>
        )}

        {/* Balance Card */}
        <div className="mt-8 rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-8 text-center shadow-[0_24px_70px_rgba(0,0,0,0.25)]">
          <WalletIcon className="mx-auto h-10 w-10 text-[#6BC0A4]" />
          <p className="mt-4 text-5xl font-bold text-white">
            {wallet ? wallet.balance.toFixed(2) : '0.00'} <span className="text-2xl text-[#A7BEB5]">TL</span>
          </p>
          <p className="mt-2 text-sm text-[#A7BEB5]">Current balance</p>
        </div>

        {/* Top Up Form */}
        <div className="mt-6 rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.25)]">
          <h2 className="text-lg font-semibold text-white">Add Funds</h2>
          <div className="mt-4 flex gap-3">
            <input
              type="number"
              min="1"
              step="any"
              placeholder="Amount (TL)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 rounded-2xl border border-[#4C736F] bg-[#062C24] px-4 py-3 text-white placeholder-[#A7BEB5] focus:border-[#70B4A6] focus:outline-none"
            />
            <Button
              onClick={handleTopup}
              disabled={topupLoading}
              className="rounded-2xl bg-[#70B4A6] px-6 text-[#000D0C] hover:bg-[#6BC0A4]"
            >
              {topupLoading ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </div>

        {/* Transaction History */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-white">Transaction History</h2>
          <div className="mt-4 space-y-3">
            {transactions.length === 0 ? (
              <div className="rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-6 text-center text-[#A7BEB5]">
                No transactions yet.
              </div>
            ) : (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-2xl border border-[#18423b]/80 bg-[#031712]/95 px-5 py-4"
                >
                  <div className="flex items-center gap-3">
                    {txIcon(tx.type)}
                    <div>
                      <p className="text-sm font-medium text-white">{txLabel(tx.type)}</p>
              <p className="text-xs text-[#A7BEB5]">{formatDate((tx as any).created_at || (tx as any).timestamp)}</p>
                    </div>
                  </div>
                  <p className={`text-lg font-semibold ${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(2)} TL
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
