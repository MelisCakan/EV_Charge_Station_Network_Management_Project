'use client';

import { useEffect, useState } from 'react';
import { stationApi, reservationApi, handleApiError } from '@/lib/api';
import { ChargingStation, Charger } from '@/lib/types';
import { MapPin, Clock, Zap, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

function buildAvailabilityOptions(charger: Charger, reservations: any[] = []) {
  if (charger.status === 'offline') {
    return [{ value: 'offline', label: 'Offline for maintenance', disabled: true }];
  }

  const options: Array<{ value: string; label: string; disabled: boolean }> = [];
  const realNow = new Date();
  const startFrom = new Date(realNow);
  startFrom.setMinutes(0, 0, 0);
  startFrom.setHours(startFrom.getHours() + 1);

  const endTime = new Date(startFrom.getTime() + 24 * 60 * 60 * 1000);
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

export default function StationsPage() {
  const { user, isAuthenticated } = useAuth();
  const [stations, setStations] = useState<ChargingStation[]>([]);
  const [stationChargers, setStationChargers] = useState<Record<number, Charger[]>>({});
  const [expandedStation, setExpandedStation] = useState<number | null>(null);
  const [loadingChargers, setLoadingChargers] = useState<Record<number, boolean>>({});
  const [reservationsByCharger, setReservationsByCharger] = useState<Record<number, any[]>>({});
  const [selectedTimeByCharger, setSelectedTimeByCharger] = useState<Record<number, string>>({});
  const [reportingCharger, setReportingCharger] = useState<number | null>(null);
  const [issueDescription, setIssueDescription] = useState('');
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStations() {
      try {
        const data = await stationApi.list();
        setStations(data);
      } catch (err) {
        setError(handleApiError(err).message);
      } finally {
        setLoading(false);
      }
    }
    loadStations();
  }, []);

  const handleStationClick = async (stationId: number) => {
    if (expandedStation === stationId) {
      setExpandedStation(null);
      return;
    }
    setExpandedStation(stationId);

    if (!stationChargers[stationId]) {
      setLoadingChargers((prev) => ({ ...prev, [stationId]: true }));
      try {
        const chargers = await stationApi.chargers(String(stationId));
        setStationChargers((prev) => ({ ...prev, [stationId]: chargers }));

        const resMap: Record<number, any[]> = {};
        for (const c of chargers) {
          try {
            resMap[c.id] = await reservationApi.getForCharger(c.id);
          } catch {
            resMap[c.id] = [];
          }
        }
        setReservationsByCharger((prev) => ({ ...prev, ...resMap }));

        const initialTimes: Record<number, string> = {};
        chargers.forEach((charger) => {
          const options = buildAvailabilityOptions(charger, resMap[charger.id] || []);
          if (options.length > 0 && !options[0].disabled) {
            initialTimes[charger.id] = options[0].value;
          }
        });
        setSelectedTimeByCharger((prev) => ({ ...prev, ...initialTimes }));
      } catch (err) {
        console.error("Failed to fetch chargers", handleApiError(err).message);
      } finally {
        setLoadingChargers((prev) => ({ ...prev, [stationId]: false }));
      }
    }
  };

  const handleReportIssue = async (stationId: number, chargerId: number) => {
    if (!issueDescription.trim()) return;
    setIsSubmittingIssue(true);
    try {
      await stationApi.reportIssue({
        station_id: stationId,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] flex items-center justify-center">
        <p className="text-lg">Loading stations...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] py-10">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-sm uppercase tracking-[0.24em] text-[#70B4A6]">Network</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Charging Stations</h1>

        {error && (
          <div className="mt-6 rounded-[28px] border border-[#D45D5D]/40 bg-[#3F1818]/50 p-4 text-[#F2D1D1]">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stations.length === 0 && !error ? (
            <p className="text-[#A7BEB5]">No stations found.</p>
          ) : (
            stations.map(station => (
              <div 
                key={station.id} 
                className="rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-6 shadow-lg flex flex-col cursor-pointer transition hover:border-[#6BC0A4]/50"
                onClick={() => handleStationClick(station.id)}
              >
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-semibold text-white mb-2">{station.name}</h3>
                  {expandedStation === station.id ? (
                    <ChevronUp className="w-5 h-5 text-[#6BC0A4]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#A7BEB5]" />
                  )}
                </div>
                <div className="space-y-3 mt-4 flex-1">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#6BC0A4] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-[#F2F2F0]">{station.address}</p>
                      <p className="text-xs text-[#A7BEB5]">{station.city}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-[#6BC0A4] shrink-0" />
                    <p className="text-sm text-[#F2F2F0]">{station.operating_hours}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-[#6BC0A4] shrink-0" />
                    <span className={`text-xs px-2 py-1 rounded-full uppercase tracking-wider font-medium ${station.status === 'active' || station.status === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {station.status === 'active' ? 'online' : station.status}
                    </span>
                  </div>
                </div>

                {/* Expanded Chargers Section */}
                {expandedStation === station.id && (
                  <div className="mt-6 pt-4 border-t border-[#18423b]/80" onClick={(e) => e.stopPropagation()}>
                    <h4 className="text-sm font-medium text-[#70B4A6] uppercase tracking-widest mb-3">Chargers</h4>
                    {loadingChargers[station.id] ? (
                      <p className="text-sm text-[#A7BEB5]">Loading chargers...</p>
                    ) : (stationChargers[station.id]?.length || 0) > 0 ? (
                      <div className="space-y-3">
                        {stationChargers[station.id].map((charger) => {
                          const availabilityOptions = buildAvailabilityOptions(charger, reservationsByCharger[charger.id] || []);
                          const selectedTime = selectedTimeByCharger[charger.id] ?? availabilityOptions[0]?.value;
                          const reserveHref = `/reservations/new?station=${station.id}&charger=${charger.id}${selectedTime && selectedTime !== 'offline' && selectedTime !== 'none' ? `&datetime=${encodeURIComponent(selectedTime)}` : ''}`;
                          
                          return (
                            <div key={charger.id} className="p-4 bg-[#04211A] rounded-xl border border-[#13423a] space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-white">{charger.charger_code} ({charger.power_output}kW)</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  charger.status === 'available' ? 'bg-green-500/20 text-green-400' :
                                  charger.status === 'offline' ? 'bg-red-500/20 text-red-400' :
                                  'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  {charger.status}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-[#A7BEB5]">{charger.connector_type} • {charger.pricing_per_kwh.toFixed(2)} TL/kWh</span>
                              </div>
                              
                              <div className="space-y-2 mt-2 pt-2 border-t border-[#13423a]">
                                <label className="block text-xs text-[#D9D5D2]">Availability (Next 3 Days)</label>
                                <select
                                  value={selectedTime}
                                  onChange={(event) => setSelectedTimeByCharger((prev) => ({ ...prev, [charger.id]: event.target.value }))}
                                  className="w-full rounded-xl border border-[#4C736F] bg-[#02110F] px-3 py-2 text-[#F2F2F0] text-xs outline-none transition focus:border-[#6BC0A4] focus:ring-1 focus:ring-[#6BC0A4]/30"
                                >
                                  {availabilityOptions.map((option) => (
                                    <option key={option.value} value={option.value} disabled={option.disabled}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                
                                <div className="flex gap-2">
                                  <a
                                    href={reserveHref}
                                    className={`flex-1 inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold transition ${charger.status !== 'offline' ? 'bg-[#2563EB] text-white hover:bg-[#1D4ED8]' : 'cursor-not-allowed bg-[#334155] text-[#94A3B8]'}`}
                                    aria-disabled={charger.status === 'offline'}
                                  >
                                    Reserve
                                  </a>
  
                                  {isAuthenticated && user?.role === 'driver' && (
                                    <button
                                      onClick={() => setReportingCharger(charger.id)}
                                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D45D5D]/40 bg-[#3F1818]/50 px-3 py-2 text-xs font-semibold text-[#F2D1D1] transition hover:bg-[#D45D5D]/20"
                                    >
                                      <AlertTriangle className="h-3.5 w-3.5" />
                                      Report
                                    </button>
                                  )}
                                </div>
                                
                                {reportingCharger === charger.id && (
                                  <div className="mt-3 rounded-xl border border-[#4C736F] bg-[#0A2E23] p-3">
                                    <label className="block text-[11px] font-medium text-[#D9D5D2] mb-1.5">Describe the issue</label>
                                    <textarea
                                      rows={2}
                                      value={issueDescription}
                                      onChange={(e) => setIssueDescription(e.target.value)}
                                      className="w-full rounded-lg border border-[#13423a]/80 bg-[#031912] p-2 text-xs text-white outline-none focus:border-[#6BC0A4]"
                                      placeholder="e.g. Connector is damaged..."
                                    />
                                    <div className="mt-2 flex justify-end gap-2">
                                      <button
                                        onClick={() => { setReportingCharger(null); setIssueDescription(''); }}
                                        className="rounded-lg px-3 py-1.5 text-[11px] font-medium text-[#A7BEB5] hover:text-white transition"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => handleReportIssue(station.id, charger.id)}
                                        disabled={isSubmittingIssue || !issueDescription.trim()}
                                        className="rounded-lg bg-[#6BC0A4] px-3 py-1.5 text-[11px] font-semibold text-[#000D0C] hover:bg-[#70B4A6] disabled:opacity-50 transition"
                                      >
                                        {isSubmittingIssue ? 'Submitting...' : 'Submit'}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-[#A7BEB5]">No chargers found for this station.</p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}