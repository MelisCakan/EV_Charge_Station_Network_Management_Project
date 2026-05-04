'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { reservationApi, stationApi, handleApiError } from '@/lib/api';
import { Clock, CalendarX2, Zap, LayoutDashboard } from 'lucide-react';

export default function ReservationsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    fetchReservations();
  }, [isLoading, isAuthenticated]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const [data, stations] = await Promise.all([
        reservationApi.list(),
        stationApi.list().catch(() => [])
      ]);
      
      // Sort with newest (upcoming) first
      const sorted = data.sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
      
      const uniqueStationIds = Array.from(new Set<string>(sorted.map((r: any) => String(r.station_id))));
      const chargersArrays = await Promise.all(
        uniqueStationIds.map((id: string) => stationApi.chargers(id).catch(() => []))
      );

      const stationMap = new Map(stations.map((s: any) => [String(s.id), s.name]));
      const chargerMap = new Map();
      chargersArrays.flat().forEach((c: any) => {
        chargerMap.set(String(c.id), c.charger_code);
      });

      const enhancedReservations = sorted.map((r: any) => ({
        ...r,
        station_name: stationMap.get(String(r.station_id)) || `Station ID: ${r.station_id}`,
        charger_name: chargerMap.get(String(r.charger_id)) || `Charger ID: ${r.charger_id}`
      }));

      setReservations(enhancedReservations);
    } catch (err) {
      setError(handleApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;
    try {
      await reservationApi.cancel(id);
      await fetchReservations(); // Refresh the list
    } catch (err) {
      alert(handleApiError(err).message);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] flex items-center justify-center">
        <p className="text-lg">Loading reservations...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] py-10">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[#70B4A6]">Your schedule</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">My Reservations</h1>
          </div>
          <Link 
            href="/reservations/new" 
            className="inline-flex items-center gap-2 rounded-2xl bg-[#4C736F] px-5 py-3 text-sm font-semibold text-[#F2F2F0] transition hover:bg-[#6BC0A4]"
          >
            <Zap size={18} />
            Book a charger
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-[#D45D5D]/40 bg-[#3F1818]/50 px-4 py-3 text-sm text-[#F2D1D1]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-12 text-center shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
            <p className="text-[#D9D5D2]/80">Loading...</p>
          </div>
        ) : reservations.length === 0 ? (
          <div className="rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-12 text-center shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
            <CalendarX2 className="mx-auto h-12 w-12 text-[#4C736F] opacity-50 mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No active reservations</h3>
            <p className="text-[#D9D5D2]/80 max-w-sm mx-auto">You don't have any upcoming reservations. Book a slot to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {reservations.map((reservation) => {
              const now = new Date();
              const startTime = new Date(reservation.start_time);
              const isUpcoming = reservation.status === 'confirmed' && now < startTime;

              return (
                <div key={reservation.id} className="rounded-3xl border border-[#18423b]/80 bg-[#031712]/95 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.15)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={16} className="text-[#6BC0A4]" />
                      <span className="text-white font-medium">
                        {new Date(reservation.start_time).toLocaleString(undefined, {
                          weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                      <span className="text-[#D9D5D2]/60 mx-1">—</span>
                      <span className="text-white font-medium">
                        {new Date(reservation.end_time).toLocaleTimeString(undefined, {
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="text-sm text-[#D9D5D2]/80 space-y-1">
                      <p>{reservation.station_name} • {reservation.charger_name}</p>
                      <p>Status: <span className="capitalize text-[#70B4A6]">{reservation.status}</span></p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3 md:items-end w-full md:w-auto">
                    {(reservation.status === 'confirmed' || reservation.status === 'active' || reservation.status === 'completed') && (
                      <button
                        onClick={() => {
                          if (new Date() < new Date(reservation.start_time)) {
                            alert("Your reservation hasn't started yet.");
                          } else {
                            router.push(`/charging/${reservation.id}`);
                          }
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#4C736F]/50 bg-[#0D2B25] px-4 py-2 text-sm font-medium text-[#6BC0A4] transition hover:bg-[#18423b] hover:border-[#6BC0A4]"
                      >
                        <LayoutDashboard size={15} />
                        Charging Dashboard
                      </button>
                    )}
                    
                    {isUpcoming && (
                      <button 
                        onClick={() => handleCancel(reservation.id)}
                        className="w-full md:w-auto rounded-2xl border border-[#D45D5D]/40 px-5 py-2 text-sm font-semibold text-[#F2D1D1] transition hover:bg-[#3F1818]/50"
                      >
                        Cancel Reservation
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
        )}
      </div>
    </div>
  );
}