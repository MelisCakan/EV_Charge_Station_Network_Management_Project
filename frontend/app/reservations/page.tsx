'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { reservationApi, stationApi, handleApiError } from '@/lib/api';
import { ChargingStation } from '@/lib/types';
import { Calendar, Clock, MapPin, Plus, XCircle } from 'lucide-react';

interface Reservation {
  id: number;
  station_id: number;
  charger_id: number;
  vehicle_id: number;
  start_time: string;
  end_time: string;
  status: string;
  total_cost: number | null;
}

export default function ReservationsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stations, setStations] = useState<Record<number, ChargingStation>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || user?.role !== 'driver') {
      router.push(user?.role === 'admin' ? '/admin' : user?.role === 'operator' ? '/operator' : '/');
    }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'driver') return;
    
    async function loadData() {
      setLoading(true);
      try {
        const [resData, statData] = await Promise.all([
          reservationApi.list(),
          stationApi.list()
        ]);
        
        // Sort reservations by start_time descending (newest first)
        const sortedReservations = resData.sort((a: Reservation, b: Reservation) => 
          new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        );
        
        setReservations(sortedReservations);
        
        const statMap: Record<number, ChargingStation> = {};
        statData.forEach((s: ChargingStation) => { statMap[s.id] = s; });
        setStations(statMap);
      } catch (err) {
        setError(handleApiError(err).message);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [isAuthenticated, user]);

  const handleCancel = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this reservation? Penalties may apply if it is less than 30 minutes before the start time.')) {
      return;
    }
    
    setCancelling(id);
    try {
      await reservationApi.cancel(id);
      // Update local state to show as cancelled
      setReservations(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' } : r));
    } catch (err) {
      alert('Failed to cancel reservation: ' + handleApiError(err).message);
    } finally {
      setCancelling(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] flex items-center justify-center">
        <p className="text-lg">Loading reservations...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] py-10">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[#70B4A6]">Your Bookings</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">My Reservations</h1>
          </div>
          <Link
            href="/reservations/new"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#4C736F] bg-[#0B3E34] px-5 py-3 text-sm font-semibold text-[#F2F2F0] shadow-[0_12px_30px_rgba(11,62,52,0.3)] transition hover:border-[#6BC0A4] hover:bg-[#11614b]"
          >
            <Plus className="h-4 w-4" />
            New Reservation
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-[#D45D5D]/40 bg-[#3F1818]/50 px-4 py-3 text-sm text-[#F2D1D1]">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {reservations.length === 0 && !error ? (
            <div className="rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-10 text-center shadow-lg">
              <Calendar className="mx-auto h-12 w-12 text-[#4C736F] mb-4" />
              <p className="text-lg text-[#D9D5D2]">You do not have any reservations yet.</p>
              <Link href="/reservations/new" className="inline-block mt-4 text-[#6BC0A4] hover:underline">
                Book your first charger
              </Link>
            </div>
          ) : (
            reservations.map(reservation => {
              const isConfirmed = reservation.status === 'confirmed';
              const isPast = new Date(reservation.start_time) < new Date();
              const canCancel = isConfirmed && !isPast;
              
              return (
                <div key={reservation.id} className="rounded-[24px] border border-[#18423b]/80 bg-[#031712]/95 p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 transition hover:border-[#4C736F]/50">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        reservation.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                        reservation.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                        reservation.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {reservation.status.replace('_', ' ')}
                      </span>
                      <span className="text-sm font-medium text-[#A7BEB5]">ID: #{reservation.id}</span>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-[#6BC0A4] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-lg font-medium text-white">
                          {stations[reservation.station_id]?.name || `Station #${reservation.station_id}`}
                        </p>
                        <p className="text-sm text-[#D9D5D2]/80">Charger #{reservation.charger_id}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-[#6BC0A4] shrink-0" />
                      <p className="text-[#F2F2F0]">{formatDate(reservation.start_time)}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row md:flex-col items-center sm:items-end gap-3 shrink-0">
                    <div className="text-center sm:text-right">
                      <p className="text-sm text-[#A7BEB5]">Total Cost</p>
                      <p className="text-xl font-bold text-white">{reservation.total_cost?.toFixed(2) || '0.00'} TL</p>
                    </div>
                    
                    {canCancel && (
                      <button
                        onClick={() => handleCancel(reservation.id)}
                        disabled={cancelling === reservation.id}
                        className="inline-flex items-center gap-2 rounded-2xl border border-[#D45D5D]/40 bg-[#3F1818]/50 px-4 py-2 text-sm font-medium text-[#F2D1D1] transition hover:bg-[#D45D5D]/20 disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        {cancelling === reservation.id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}