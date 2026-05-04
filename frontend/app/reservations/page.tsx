'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { stationApi, vehicleApi, reservationApi, handleApiError } from '@/lib/api';
import { type Reservation, type ChargingStation, type Vehicle, type Charger } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, CalendarDays, CheckCircle2, CreditCard, Zap, Car, Clock } from 'lucide-react';
import Link from 'next/link';

function formatDateTime(value: string) {
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReservationsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stations, setStations] = useState<ChargingStation[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    setIsReady(true);
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isReady) return;

    async function loadReservations() {
      try {
        setLoading(true);
        const [reservationData, stationData, vehicleData] = await Promise.all([
          reservationApi.list(),
          stationApi.list(),
          vehicleApi.list(),
        ]);

        setReservations(reservationData || []);
        setStations(stationData || []);
        setVehicles(vehicleData || []);
      } catch (err) {
        setError(handleApiError(err).message);
      } finally {
        setLoading(false);
      }
    }

    loadReservations();
  }, [isReady]);

  const getStationName = (stationId: number) => {
    const station = stations.find((item) => item.id === stationId);
    return station ? station.name : `Station ${stationId}`;
  };

  const getVehicleLabel = (vehicleId: number) => {
    const vehicle = vehicles.find((item) => item.id === vehicleId);
    return vehicle ? `${vehicle.brand} ${vehicle.model}` : `Vehicle ${vehicleId}`;
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] flex items-center justify-center">
        <p className="text-lg">Loading reservations...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[#70B4A6]">Your reservations</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Current bookings</h1>
          </div>
          <Button variant="outline" onClick={() => router.push('/reservations/new')}>
            New reservation
          </Button>
        </div>

        {error && (
          <Alert className="mt-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mt-8 grid gap-6">
          {loading ? (
            <div className="rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-8 text-center text-[#D9D5D2]">Loading reservations...</div>
          ) : reservations.length === 0 ? (
            <div className="rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-10 text-center">
              <p className="text-lg text-[#D9D5D2]">No reservations found.</p>
              <p className="mt-3 text-sm text-[#A7BEB5]">Create a booking to reserve your next charging slot.</p>
              <Button className="mt-6" onClick={() => router.push('/reservations/new')}>
                Reserve now
              </Button>
            </div>
          ) : (
            reservations.map((reservation) => (
              <div key={reservation.id} className="rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-8 shadow-[0_24px_70px_rgba(0,0,0,0.25)]">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-[#70B4A6]">Reservation #{reservation.id}</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">{getStationName(reservation.station_id)}</h2>
                    <p className="mt-2 text-sm text-[#D9D5D2]/80">{getVehicleLabel(reservation.vehicle_id)}</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-[#4C736F] bg-[#062C24] px-4 py-2 text-sm text-[#D9D5D2]">
                    <Zap className="h-4 w-4 text-[#6BC0A4]" />
                    {reservation.status}
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-[#13423a]/80 bg-[#031912]/95 p-4">
                    <p className="text-sm text-[#D9D5D2]">Start</p>
                    <p className="mt-2 text-white">{formatDateTime(reservation.start_time)}</p>
                  </div>
                  <div className="rounded-3xl border border-[#13423a]/80 bg-[#031912]/95 p-4">
                    <p className="text-sm text-[#D9D5D2]">End</p>
                    <p className="mt-2 text-white">{formatDateTime(reservation.end_time)}</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-[#D9D5D2]">
                  <span className="rounded-full bg-[#0B3E34] px-3 py-1">Charger: {reservation.charger_id}</span>
                  <span className="rounded-full bg-[#0B3E34] px-3 py-1">Total cost: {reservation.total_cost ?? 'Pending'}</span>
                  <Link href={`/stations/${reservation.station_id}`} className="text-[#70B4A6] hover:text-[#6BC0A4]">
                    View station
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
