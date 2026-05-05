'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { sessionApi, receiptApi, handleApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Zap, Clock, Battery, DollarSign, CheckCircle2 } from 'lucide-react';

interface SessionProgress {
  session_id: number;
  current_battery_level: number;
  energy_consumed: number;
  cost_so_far: number;
  elapsed_seconds: number;
  status: string;
  auto_completed: boolean;
}

export default function ChargingDashboardPage() {
  const { sessionId } = useParams();
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [progress, setProgress] = useState<SessionProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const fetchProgress = useCallback(async () => {
    if (!sessionId) return;
    try {
      const data = await sessionApi.progress(Number(sessionId));
      setProgress(data);
      if (data.status === 'completed') {
        setCompleted(true);
      }
    } catch (err) {
      setError(handleApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Poll every 5 seconds
  useEffect(() => {
    if (!isAuthenticated || isLoading || !sessionId) return;

    fetchProgress();

    const interval = setInterval(() => {
      if (!completed) {
        fetchProgress();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isAuthenticated, isLoading, sessionId, completed, fetchProgress]);

  const handleComplete = async () => {
    if (!progress || !sessionId) return;
    try {
      setCompleting(true);
      await sessionApi.complete(Number(sessionId), progress.current_battery_level);
      await fetchProgress();
      setCompleted(true);
    } catch (err) {
      setError(handleApiError(err).message);
    } finally {
      setCompleting(false);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] flex items-center justify-center">
        <p className="text-lg">Loading session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] py-10">
      <div className="mx-auto max-w-2xl px-4">
        <p className="text-sm uppercase tracking-[0.24em] text-[#70B4A6]">Charging session</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">
          {completed ? 'Charging Complete' : 'Charging in Progress'}
        </h1>

        {error && (
          <Alert className="mt-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {progress && (
          <>
            {/* Battery Circle */}
            <div className="mt-10 flex justify-center">
              <div className="relative h-52 w-52">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="85" fill="none" stroke="#18423b" strokeWidth="14" />
                  <circle
                    cx="100" cy="100" r="85"
                    fill="none"
                    stroke={completed ? '#6BC0A4' : '#70B4A6'}
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 85}`}
                    strokeDashoffset={`${2 * Math.PI * 85 * (1 - progress.current_battery_level / 100)}`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-white">
                    {Math.round(progress.current_battery_level)}%
                  </span>
                  <span className="text-sm text-[#A7BEB5]">Battery</span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="mt-10 grid grid-cols-2 gap-4">
              <div className="rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-6 text-center">
                <Zap className="mx-auto h-6 w-6 text-[#6BC0A4]" />
                <p className="mt-3 text-2xl font-semibold text-white">{progress.energy_consumed.toFixed(2)}</p>
                <p className="mt-1 text-sm text-[#A7BEB5]">kWh consumed</p>
              </div>
              <div className="rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-6 text-center">
                <DollarSign className="mx-auto h-6 w-6 text-[#6BC0A4]" />
                <p className="mt-3 text-2xl font-semibold text-white">{progress.cost_so_far.toFixed(2)}</p>
                <p className="mt-1 text-sm text-[#A7BEB5]">TL cost</p>
              </div>
              <div className="rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-6 text-center">
                <Clock className="mx-auto h-6 w-6 text-[#6BC0A4]" />
                <p className="mt-3 text-2xl font-semibold text-white">{formatTime(progress.elapsed_seconds)}</p>
                <p className="mt-1 text-sm text-[#A7BEB5]">Elapsed time</p>
              </div>
              <div className="rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-6 text-center">
                <Battery className="mx-auto h-6 w-6 text-[#6BC0A4]" />
                <p className="mt-3 text-2xl font-semibold text-white">{progress.status}</p>
                <p className="mt-1 text-sm text-[#A7BEB5]">Status</p>
              </div>
            </div>

            {/* Auto-complete notice */}
            {progress.auto_completed && (
              <div className="mt-6 rounded-[28px] border border-[#4C736F] bg-[#062C24] p-4 text-center text-[#D9D5D2]">
                <p>Session was automatically completed due to the 2-hour time limit.</p>
              </div>
            )}

            {/* Actions */}
            <div className="mt-8 flex justify-center gap-4">
              {completed ? (
                <div className="flex flex-col items-center gap-4">
                  <CheckCircle2 className="h-12 w-12 text-[#6BC0A4]" />
                  <p className="text-lg text-[#D9D5D2]">
                    Total: <span className="font-semibold text-white">{progress.cost_so_far.toFixed(2)} TL</span>
                  </p>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => router.push('/reservations')}>
                      My Reservations
                    </Button>
                    <Button onClick={() => router.push('/wallet')}>
                      View Wallet
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="lg"
                  onClick={handleComplete}
                  disabled={completing}
                  className="rounded-2xl bg-[#70B4A6] px-8 py-3 text-[#000D0C] hover:bg-[#6BC0A4]"
                >
                  {completing ? 'Completing...' : 'Stop Charging'}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
