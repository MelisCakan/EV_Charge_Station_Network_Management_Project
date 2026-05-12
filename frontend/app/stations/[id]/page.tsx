'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, BatteryCharging, DollarSign, Wifi, Zap, AlertTriangle } from 'lucide-react';
import { ChargingStation, Charger } from '@/lib/types';
import { stationApi, reservationApi, handleApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

const statusStyles: Record<string, string> = {
  available: 'bg-emerald-500/10 text-emerald-300',
  occupied: 'bg-amber-500/10 text-amber-300',
  offline: 'bg-red-500/10 text-red-300',
};

const chargerTypeStyles: Record<string, string> = {
  AC: 'bg-sky-500/10 text-sky-300',
  DC: 'bg-violet-500/10 text-violet-300',
};

function buildAvailabilityOptions(charger: Charger, reservations: any[] = []) {
  if (charger.status === 'offline') {
    return [{ value: 'offline', label: 'Offline for maintenance', disabled: true }];
  }

  const options: Array<{ value: string; label: string; disabled: boolean }> = [];
  const realNow = new Date();
  const startFrom = new Date(realNow);
  startFrom.setMinutes(0, 0, 0);
  startFrom.setHours(startFrom.getHours() + 1);

  const endTime = new Date(startFrom.getTime() + 3 * 24 * 60 * 60 * 1000);
  let currentTime = new Date(startFrom);

  while (currentTime <= endTime) {
    const slotStart = new Date(currentTime);
    const slotEnd = new Date(currentTime.getTime() + 60 * 60 * 1000);
    const isPast = slotStart <= realNow;
    const isOccupied = reservations.some(r => {
      const utc = (s: string) => s && !s.endsWith('Z') ? s + 'Z' : s;
      const rStart = new Date(utc(r.start_time));
      const duration = r.duration_minutes || 60;
      const rEnd = new Date(r.end_time ? utc(r.end_time) : rStart.getTime() + duration * 60000);
      return (slotStart < rEnd && slotEnd > rStart);
    });
    const dayStr = slotStart.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = slotStart.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const status = isPast ? 'Past' : isOccupied ? 'Occupied' : 'Available';
    options.push({ value: slotStart.toISOString(), label: `${dayStr} ${timeStr} — ${status}`, disabled: isPast || isOccupied });
    currentTime.setHours(currentTime.getHours() + 1);
  }

  if (options.length === 0) {
    return [{ value: 'none', label: 'No available slots', disabled: true }];
  }

  return options;
}

export default function StationDetailsPage() {
  const params = useParams();
  const stationId = params.id as string;
  const { user, isAuthenticated } = useAuth();
  const [station, setStation] = useState<ChargingStation | null>(null);
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [reservationsByCharger, setReservationsByCharger] = useState<Record<number, any[]>>({});
  const [selectedTimeByCharger, setSelectedTimeByCharger] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportingCharger, setReportingCharger] = useState<number | null>(null);
  const [issueDescription, setIssueDescription] = useState('');
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

  const handleReportIssue = async (chargerId: number) => {
    if (!issueDescription.trim()) return;
    setIsSubmittingIssue(true);
    try {
      await stationApi.reportIssue({
        station_id: Number(stationId),
        charger_id: chargerId,
        description: issueDescription
      });
      alert('Issue reported successfully. Operators have been notified.');
      setReportingCharger(null);
      setIssueDescription('');
    } catch (err) {
      alert('Failed to report issue: ' + handleApiError(err).message);
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const [stationData, chargersData] = await Promise.all([
          stationApi.details(stationId),
          stationApi.chargers(stationId),
        ]);
        setStation(stationData);
        setChargers(chargersData);

        const resMap: Record<number, any[]> = {};
        for (const c of chargersData) {
          try {
            resMap[c.id] = await reservationApi.getForCharger(c.id);
          } catch {
            resMap[c.id] = [];
          }
        }
        setReservationsByCharger(resMap);

        const initialTimes: Record<number, string> = {};
        chargersData.forEach((charger) => {
          const options = buildAvailabilityOptions(charger, resMap[charger.id] || []);
          if (options.length > 0 && !options[0].disabled) {
            initialTimes[charger.id] = options[0].value;
          }
        });
        setSelectedTimeByCharger(initialTimes);
      } catch (err) {
        const apiErr = handleApiError(err);
        setError(apiErr.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [stationId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] flex items-center justify-center">
        <p className="text-lg">Loading station...</p>
      </div>
    );
  }

  if (error || !station) {
    return (
      <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-400">{error || 'Station not found'}</p>
          <Link href="/" className="mt-4 inline-block text-[#70B4A6] hover:text-[#6BC0A4]">
            Back to map
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#70B4A6] transition hover:text-[#6BC0A4]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to map
        </Link>

        <div className="mt-6 rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[#70B4A6]">Station details</p>
              <h1 className="mt-3 text-3xl font-semibold text-white">{station.name}</h1>
              <p className="mt-2 max-w-2xl text-sm text-[#D9D5D2]/80">
                {station.address}{station.city ? `, ${station.city}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-[#4C736F] bg-[#062C24] px-4 py-2 text-sm text-[#D9D5D2]">
                <Zap className="h-4 w-4 text-[#6BC0A4]" />
                {station.operating_hours}
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-[#4C736F] bg-[#062C24] px-4 py-2 text-sm text-[#D9D5D2]">
                <BatteryCharging className="h-4 w-4 text-[#6BC0A4]" />
                {chargers.length} chargers
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-[#4C736F] bg-[#062C24] px-4 py-2 text-sm text-[#D9D5D2]">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${station.status === 'active' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
                  {station.status}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {chargers.map((charger) => {
              const availabilityOptions = buildAvailabilityOptions(charger, reservationsByCharger[charger.id] || []);
              const selectedTime = selectedTimeByCharger[charger.id] ?? availabilityOptions[0]?.value;
              const reserveHref = `/reservations/new?station=${station.id}&charger=${charger.id}${selectedTime && selectedTime !== 'offline' && selectedTime !== 'none' ? `&datetime=${encodeURIComponent(selectedTime)}` : ''}`;

              return (
                <div
                  key={charger.id}
                  className="rounded-[24px] border border-[#18423b]/80 bg-[#042117]/95 p-6 shadow-[0_24px_50px_rgba(0,0,0,0.25)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm uppercase tracking-[0.24em] text-[#70B4A6]">{charger.charger_code}</p>
                      <h2 className="mt-3 text-xl font-semibold text-white">{charger.connector_type}</h2>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${chargerTypeStyles[charger.charger_type] || ''}`}>
                      {charger.charger_type}
                    </span>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="flex items-center gap-3 rounded-3xl border border-[#13423a]/80 bg-[#031912]/95 px-4 py-4">
                      <BatteryCharging className="h-4 w-4 text-[#6BC0A4]" />
                      <div>
                        <p className="text-sm text-[#D9D5D2]">Power</p>
                        <p className="text-lg font-semibold text-white">{charger.power_output} kW</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-3xl border border-[#13423a]/80 bg-[#031912]/95 px-4 py-4">
                      <DollarSign className="h-4 w-4 text-[#6BC0A4]" />
                      <div>
                        <p className="text-sm text-[#D9D5D2]">Price / kWh</p>
                        <p className="text-lg font-semibold text-white">{charger.pricing_per_kwh.toFixed(2)} TL</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-3xl border border-[#13423a]/80 bg-[#031912]/95 px-4 py-4">
                      <Wifi className="h-4 w-4 text-[#6BC0A4]" />
                      <div>
                        <p className="text-sm text-[#D9D5D2]">Status</p>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[charger.status] || ''}`}>
                          {charger.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <label className="block text-sm text-[#D9D5D2]">Availability</label>
                    <select
                      value={selectedTime}
                      onChange={(event) => setSelectedTimeByCharger((prev) => ({ ...prev, [charger.id]: event.target.value }))}
                      className="w-full rounded-3xl border border-[#4C736F] bg-[#02110F] px-4 py-3 text-[#F2F2F0] outline-none transition focus:border-[#6BC0A4] focus:ring-2 focus:ring-[#6BC0A4]/30"
                    >
                      {availabilityOptions.map((option) => (
                        <option key={option.value} value={option.value} disabled={option.disabled}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <a
                      href={reserveHref}
                      className={`inline-flex w-full items-center justify-center rounded-3xl px-4 py-3 text-sm font-semibold transition ${charger.status !== 'offline' ? 'bg-[#2563EB] text-white hover:bg-[#1D4ED8]' : 'cursor-not-allowed bg-[#334155] text-[#94A3B8]'}`}
                      aria-disabled={charger.status === 'offline'}
                    >
                      Reserve this charger
                    </a>

                    {isAuthenticated && user?.role === 'driver' && (
                      <button
                        onClick={() => setReportingCharger(charger.id)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-3xl border border-[#D45D5D]/40 bg-[#3F1818]/50 px-4 py-3 text-sm font-semibold text-[#F2D1D1] transition hover:bg-[#D45D5D]/20"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        Report an issue
                      </button>
                    )}

                    {reportingCharger === charger.id && (
                      <div className="mt-4 rounded-2xl border border-[#4C736F] bg-[#0A2E23] p-4 shadow-lg">
                        <label className="block text-xs font-medium text-[#D9D5D2] mb-2">Describe the issue</label>
                        <textarea
                          rows={3}
                          value={issueDescription}
                          onChange={(e) => setIssueDescription(e.target.value)}
                          className="w-full rounded-xl border border-[#13423a]/80 bg-[#031912] p-3 text-sm text-white outline-none focus:border-[#6BC0A4]"
                          placeholder="e.g. Connector is physically damaged..."
                        />
                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            onClick={() => { setReportingCharger(null); setIssueDescription(''); }}
                            className="rounded-xl px-4 py-2 text-xs font-medium text-[#A7BEB5] hover:text-white transition"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleReportIssue(charger.id)}
                            disabled={isSubmittingIssue || !issueDescription.trim()}
                            className="rounded-xl bg-[#6BC0A4] px-4 py-2 text-xs font-semibold text-[#000D0C] hover:bg-[#70B4A6] disabled:opacity-50 transition"
                          >
                            {isSubmittingIssue ? 'Submitting...' : 'Submit Report'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
