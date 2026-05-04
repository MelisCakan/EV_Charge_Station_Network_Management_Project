'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { reservationApi, stationApi, handleApiError } from '@/lib/api';
import { Charger } from '@/lib/types';
import { ArrowLeft, Battery, DollarSign, Timer, Zap, FileText } from 'lucide-react';

export default function ChargingDashboardPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [reservation, setReservation] = useState<any | null>(null);
  const [charger, setCharger] = useState<Charger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;

    async function fetchSessionData() {
      try {
        setLoading(true);
        // Fetch all reservations to find the specific session
        const reservations = await reservationApi.list();
        const session = reservations.find((r: any) => String(r.id) === sessionId);

        if (!session) {
          throw new Error('Charging session not found');
        }
        setReservation(session);

        // Fetch charger details to get power & pricing output rules
        const stationChargers = await stationApi.chargers(String(session.station_id));
        const matchedCharger = stationChargers.find((c: Charger) => String(c.id) === String(session.charger_id));
        
        if (matchedCharger) {
          setCharger(matchedCharger);
        }
      } catch (err) {
        setError(handleApiError(err).message);
      } finally {
        setLoading(false);
      }
    }

    fetchSessionData();
  }, [sessionId, isAuthenticated, isAuthLoading]);

  // Real-time tick effect
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (isAuthLoading || loading) {
    return (
      <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] flex items-center justify-center">
        <div className="flex flex-col items-center animate-pulse">
          <Zap className="h-10 w-10 text-[#6BC0A4] mb-4" />
          <p className="text-lg">Initializing dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !reservation || !charger) {
    return (
      <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] flex items-center justify-center">
        <div className="text-center bg-[#031712] border border-[#18423b] p-10 rounded-[32px]">
          <p className="text-lg text-red-400 mb-4">{error || 'Session failed to load'}</p>
          <button onClick={() => router.push('/reservations')} className="rounded-2xl bg-[#4C736F] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#6BC0A4]">
            Return to Reservations
          </button>
        </div>
      </div>
    );
  }

  // Metrics Calculations
  const startTime = new Date(reservation.start_time);
  const endTime = new Date(reservation.end_time);
  const durationMs = endTime.getTime() - startTime.getTime();
  
  // Calculate if the reservation has finished based on time
  const isComplete = now >= endTime || reservation.status === 'completed';

  // Clamp elapsed time between 0 and total duration
  const elapsedMs = isComplete ? durationMs : Math.max(0, Math.min(now.getTime() - startTime.getTime(), durationMs));
  const progress = (elapsedMs / durationMs) * 100;
  
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const kwhDelivered = elapsedHours * charger.power_output;
  const currentCost = kwhDelivered * charger.pricing_per_kwh;

  const remainingMs = durationMs - elapsedMs;
  const remainingMins = Math.floor(remainingMs / (1000 * 60));
  const remainingSecs = Math.floor((remainingMs % (1000 * 60)) / 1000);

  // Example start/end battery percentage. Since we don't know the exact battery capacity and state,
  // we'll mock it based on progress for UI demonstration purposes.
  const startBattery = 20; // 20%
  const currentBattery = Math.min(100, startBattery + (progress * 0.8)); // scales from 20% to ~100%

  return (
    <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0]">
      <div className="max-w-3xl mx-auto px-4 py-10 sm:px-6">
        <Link href="/reservations" className="inline-flex items-center gap-2 text-sm font-medium text-[#70B4A6] transition hover:text-[#6BC0A4] mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        {isComplete ? (
          <div className="rounded-[32px] border border-[#18423b]/80 bg-[#031712]/95 p-8 sm:p-12 shadow-[0_30px_80px_rgba(0,0,0,0.3)] text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#0F3E32] mb-6">
              <Zap className="h-10 w-10 text-[#6BC0A4]" />
            </div>
            <h1 className="text-3xl font-semibold text-white tracking-tight mb-2">Charging Complete</h1>
            <p className="text-[#D9D5D2]/70 text-sm mb-8">Station ID: {reservation.station_id} • Charger: {charger.charger_code}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-left">
              <div className="bg-[#042117]/50 border border-[#13362d] rounded-2xl p-4">
                <p className="text-xs text-[#D9D5D2]/70 uppercase font-medium">Start %</p>
                <p className="text-xl font-semibold text-white mt-1">%{startBattery.toFixed(0)}</p>
              </div>
              <div className="bg-[#042117]/50 border border-[#13362d] rounded-2xl p-4">
                <p className="text-xs text-[#D9D5D2]/70 uppercase font-medium">End %</p>
                <p className="text-xl font-semibold text-white mt-1">%{currentBattery.toFixed(0)}</p>
              </div>
              <div className="bg-[#042117]/50 border border-[#13362d] rounded-2xl p-4">
                <p className="text-xs text-[#D9D5D2]/70 uppercase font-medium">Consumption (kWh)</p>
                <p className="text-xl font-semibold text-white mt-1">{kwhDelivered.toFixed(2)}</p>
              </div>
              <div className="bg-[#042117]/50 border border-[#13362d] rounded-2xl p-4">
                <p className="text-xs text-[#D9D5D2]/70 uppercase font-medium">Total Cost</p>
                <p className="text-xl font-semibold text-white mt-1">₺{currentCost.toFixed(2)}</p>
              </div>
            </div>

            <button onClick={() => alert("Downloading/showing receipt...")} className="inline-flex items-center gap-2 rounded-2xl bg-[#4C736F] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#6BC0A4]">
              <FileText className="h-5 w-5" />
              View Receipt
            </button>
          </div>
        ) : (
          <div className="rounded-[32px] border border-[#18423b]/80 bg-[#031712]/95 p-8 sm:p-12 shadow-[0_30px_80px_rgba(0,0,0,0.3)]">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-semibold text-white tracking-tight">
                Live Charging Dashboard
              </h1>
              <p className="text-[#D9D5D2]/70 mt-2 text-sm">Station ID: {reservation.station_id} • Charger: {charger.charger_code}</p>
            </div>

            {/* Cyclical Progress Dash */}
            <div className="relative w-64 h-64 mx-auto mb-12 flex items-center justify-center">
              {/* Background Circle */}
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90 drop-shadow-2xl">
                <path
                  className="text-[#06251c] stroke-current"
                  strokeWidth="2.5"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Dynamic Progress Circle */}
                <path
                  className="stroke-current transition-all duration-1000 ease-linear text-[#3b82f6]"
                  strokeWidth="2.5"
                  strokeDasharray={`${progress}, 100`}
                  fill="none"
                  strokeLinecap="round"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              
              {/* Inner Dashboard Values */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <Zap className="h-8 w-8 mb-2 text-[#3b82f6] animate-pulse" />
                <span className="text-4xl font-bold text-white">{progress.toFixed(1)}<span className="text-2xl">%</span></span>
                <span className="text-xs font-medium text-[#D9D5D2]/60 uppercase tracking-widest mt-1">
                  Charging
                </span>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-3 gap-4 border-t border-[#18423b] pt-8">
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#042117]/50 border border-[#13362d]">
                <Timer className="h-5 w-5 text-[#6BC0A4] mb-2" />
                <p className="text-xs text-[#D9D5D2]/70 uppercase font-medium tracking-wider">Remaining Time</p>
                <p className="text-lg font-semibold text-white mt-1 font-mono">
                  {String(remainingMins).padStart(2, '0')}:{String(remainingSecs).padStart(2, '0')}
                </p>
              </div>
              
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#042117]/50 border border-[#13362d]">
                <Battery className="h-5 w-5 text-[#6BC0A4] mb-2" />
                <p className="text-xs text-[#D9D5D2]/70 uppercase font-medium tracking-wider">Consumption (kWh)</p>
                <p className="text-lg font-semibold text-white mt-1 font-mono">{kwhDelivered.toFixed(2)}</p>
              </div>
              
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#042117]/50 border border-[#13362d]">
                <DollarSign className="h-5 w-5 text-[#6BC0A4] mb-2" />
                <p className="text-xs text-[#D9D5D2]/70 uppercase font-medium tracking-wider">Cost</p>
                <p className="text-lg font-semibold text-white mt-1 font-mono">₺{currentCost.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
