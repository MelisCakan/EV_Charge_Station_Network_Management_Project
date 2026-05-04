'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { walletApi, handleApiError } from '@/lib/api';
import { Wallet, Plus, ArrowRight, Minus } from 'lucide-react';
import Link from 'next/link';

export default function WalletPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [amountToAdd, setAmountToAdd] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    fetchBalanceAndTransactions();
  }, [isLoading, isAuthenticated]);

  const fetchBalanceAndTransactions = async () => {
    try {
      setLoading(true);
      const [data, txs] = await Promise.all([
        walletApi.get(),
        walletApi.getTransactions()
      ]);
      setBalance(data.balance);
      setTransactions(txs);
    } catch (err) {
      setError(handleApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const amount = parseFloat(amountToAdd);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    try {
      setProcessing(true);
      const data = await walletApi.add(amount);
      setBalance(data.balance);
      setAmountToAdd('');
      setSuccess(`Successfully added ₺${amount.toFixed(2)} to your wallet!`);
      const txs = await walletApi.getTransactions();
      setTransactions(txs);
    } catch (err) {
      setError(handleApiError(err).message);
    } finally {
      setProcessing(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] flex items-center justify-center">
        <p className="text-lg">Loading wallet...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] py-10">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.24em] text-[#70B4A6]">Your Account</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Digital Wallet</h1>
          <p className="text-[#D9D5D2]/80 mt-2">Manage your funds and add money to pay for reservations.</p>
        </div>

        <div className="rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col items-center justify-center py-6 border-b border-[#18423b]/80">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#0F3E32] mb-4">
              <Wallet className="h-8 w-8 text-[#6BC0A4]" />
            </div>
            <p className="text-[#D9D5D2]/80 text-sm">Available Balance</p>
            <h2 className="text-5xl font-bold text-white mt-2">₺{balance.toFixed(2)}</h2>
          </div>

          <form onSubmit={handleAddMoney} className="mt-8 space-y-6">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-[#D9D5D2]">
                Amount to Add (₺)
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <span className="text-[#D9D5D2]/80">₺</span>
                </div>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountToAdd}
                  onChange={(e) => setAmountToAdd(e.target.value)}
                  className="block w-full rounded-2xl border border-[#4C736F] bg-[#0A2E23] pl-10 pr-4 py-4 text-xl text-[#F2F2F0] outline-none transition focus:border-[#6BC0A4] focus:ring-2 focus:ring-[#6BC0A4]/20"
                  placeholder="0.00"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-[#D45D5D]/40 bg-[#3F1818]/50 px-4 py-3 text-sm text-[#F2D1D1]">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-2xl border border-[#4C736F]/40 bg-[#16382F]/50 px-4 py-3 text-sm text-[#BCE3CD]">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={processing || !amountToAdd}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#4C736F] px-6 py-4 text-sm font-semibold text-[#F2F2F0] transition hover:bg-[#6BC0A4] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-5 w-5" />
              {processing ? 'Processing...' : 'Add Funds'}
            </button>
          </form>
        </div>

        <div className="mt-8 rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
          <h2 className="text-xl font-semibold text-white mb-6">Transaction History</h2>
          
          {transactions.length === 0 ? (
            <div className="text-center py-6 text-[#D9D5D2]/60 text-sm border border-dashed border-[#18423b] rounded-2xl">
              No transactions found.
            </div>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 rounded-2xl bg-[#042117]/50 border border-[#13362d]">
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${tx.type === 'topup' || tx.type === 'refund' ? 'bg-[#0F3E32] text-[#6BC0A4]' : 'bg-[#3F1818]/50 text-[#D45D5D]'}`}>
                      {tx.type === 'topup' || tx.type === 'refund' ? <Plus size={16} /> : <Minus size={16} />}
                    </div>
                    <div>
                      <p className="font-medium text-white capitalize">{tx.type === 'topup' ? 'Deposit' : tx.type === 'charge' ? 'Payment' : tx.type}</p>
                      <p className="text-xs text-[#D9D5D2]/60 mt-0.5">
                        {new Date(tx.timestamp).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className={`font-semibold ${tx.type === 'topup' || tx.type === 'refund' ? 'text-[#6BC0A4]' : 'text-white'}`}>
                    {tx.type === 'topup' || tx.type === 'refund' ? '+' : '-'}₺{tx.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link href="/reservations/new" className="inline-flex items-center gap-2 text-sm text-[#70B4A6] hover:text-[#6BC0A4] transition">
            Make a new reservation <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}