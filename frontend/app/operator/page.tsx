'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { operatorApi, stationApi, handleApiError } from '@/lib/api';
import { ChargingStation, Charger } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Wrench, MapPin, RefreshCw } from 'lucide-react';

interface Issue {
  id: number;
  user_id: number;
  charger_id: number;
  description: string;
  category: string;
  status: string;
  reported_at: string;
}

export default function OperatorDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stations, setStations] = useState<ChargingStation[]>([]);
  const [chargers, setChargers] = useState<Record<number, Charger[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || user?.role !== 'operator') {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, user, router]);

  const loadData = async () => {
    if (!isAuthenticated || user?.role !== 'operator') return;
    setLoading(true);
    setError(null);

    try {
      // Load stations first (public endpoint, most reliable)
      const stationsData = await stationApi.list();
      setStations(stationsData);

      // Load chargers for each station
      const chargersMap: Record<number, Charger[]> = {};
      await Promise.all(
        stationsData.map(async (station) => {
          try {
            chargersMap[station.id] = await stationApi.chargers(station.id);
          } catch {
            chargersMap[station.id] = [];
          }
        })
      );
      setChargers(chargersMap);

      // Load issues separately so station load isn't blocked
      try {
        const issuesData = await operatorApi.getIssues();
        setIssues(issuesData);
      } catch (err) {
        console.error('Failed to load issues:', handleApiError(err).message);
      }
    } catch (err) {
      setError(handleApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated, user]);

  // Build lookup maps for displaying issue details
  const chargerMap: Record<number, Charger> = {};
  const chargerStationMap: Record<number, ChargingStation> = {};
  stations.forEach((station) => {
    (chargers[station.id] || []).forEach((charger) => {
      chargerMap[charger.id] = charger;
      chargerStationMap[charger.id] = station;
    });
  });

  const handleStatusToggle = async (charger: Charger) => {
    const newStatus = charger.status === 'offline' ? 'available' : 'offline';
    if (newStatus === 'offline' && !window.confirm(
      'Marking this charger offline will automatically cancel affected reservations and refund users. Proceed?'
    )) {
      return;
    }
    try {
      await operatorApi.updateChargerStatus(charger.id, newStatus);
      // Refresh chargers from backend to get accurate state
      try {
        const freshChargers = await stationApi.chargers(charger.station_id);
        setChargers(prev => ({ ...prev, [charger.station_id]: freshChargers }));
      } catch {
        // Fallback: update locally
        setChargers(prev => ({
          ...prev,
          [charger.station_id]: (prev[charger.station_id] || []).map(c =>
            c.id === charger.id ? { ...c, status: newStatus as any } : c
          ),
        }));
      }
    } catch (err) {
      alert('Failed to update charger status: ' + handleApiError(err).message);
    }
  };

  const handleResolveIssue = async (issueId: number) => {
    try {
      await operatorApi.resolveIssue(issueId);
      setIssues(prev => prev.filter(i => i.id !== issueId));
    } catch (err) {
      alert('Failed to resolve issue: ' + handleApiError(err).message);
    }
  };

  const toUTC = (ds: string) => ds && !ds.endsWith('Z') ? ds + 'Z' : ds;
  const formatDate = (ds: string) => new Date(toUTC(ds)).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const categoryStyles: Record<string, string> = {
    hardware: 'bg-red-500/20 text-red-400',
    software: 'bg-blue-500/20 text-blue-400',
    payment: 'bg-yellow-500/20 text-yellow-400',
    other: 'bg-gray-500/20 text-gray-400',
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] flex items-center justify-center">
        <p className="text-lg">Loading operator dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[#70B4A6]">Management</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Operator Dashboard</h1>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-[#D45D5D]/40 bg-[#3F1818]/50 px-4 py-3 text-sm text-[#F2D1D1]">
            {error}
          </div>
        )}

        {/* Reported Issues */}
        <div className="mt-8 rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-6 shadow-lg">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <AlertTriangle className="text-yellow-500" /> Reported Issues ({issues.length})
          </h2>
          <div className="space-y-3">
            {issues.length === 0 ? (
              <p className="text-[#A7BEB5]">No reported issues.</p>
            ) : (
              issues.map(issue => {
                const charger = chargerMap[issue.charger_id];
                const station = chargerStationMap[issue.charger_id];
                return (
                  <div key={issue.id} className="p-4 rounded-2xl bg-[#062C24] border border-[#4C736F]">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 space-y-2">
                        <p className="font-medium text-white">{issue.description}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#A7BEB5]">
                          {station && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {station.name}
                            </span>
                          )}
                          <span>
                            Charger: {charger ? `${charger.charger_code} (${charger.connector_type}, ${charger.power_output}kW)` : `#${issue.charger_id}`}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${categoryStyles[issue.category] || categoryStyles.other}`}>
                            {issue.category}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                            issue.status === 'open' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {issue.status}
                          </span>
                          <span>{formatDate(issue.reported_at)}</span>
                        </div>
                      </div>
                      {issue.status !== 'resolved' && (
                        <Button variant="secondary" size="sm" onClick={() => handleResolveIssue(issue.id)}>
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Station & Charger Management */}
        <div className="mt-8 rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-6 shadow-lg">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <Wrench className="text-[#6BC0A4]" /> Charger Maintenance
          </h2>
          {stations.length === 0 ? (
            <p className="text-[#A7BEB5]">No stations found.</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {stations.map(station => {
                const stationChargers = chargers[station.id] || [];
                return (
                  <div key={station.id} className="p-5 rounded-2xl bg-[#062C24] border border-[#4C736F]">
                    <div className="flex items-start gap-2 mb-3">
                      <MapPin className="w-5 h-5 text-[#6BC0A4] shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-lg font-medium text-white">{station.name}</h3>
                        <p className="text-xs text-[#A7BEB5]">{station.address} — {station.city}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {stationChargers.length > 0 ? (
                        stationChargers.map(charger => (
                          <div key={charger.id} className="flex justify-between items-center bg-[#031B18] p-3 rounded-xl border border-[#18423b]">
                            <div className="text-sm font-medium flex items-center flex-wrap gap-2">
                              <span className="text-white">{charger.charger_code}</span>
                              <span className="text-[#A7BEB5] text-xs">{charger.connector_type} · {charger.power_output}kW · {charger.pricing_per_kwh} TL/kWh</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                                charger.status === 'available' ? 'bg-green-500/20 text-green-400' :
                                charger.status === 'offline' ? 'bg-red-500/20 text-red-400' :
                                'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {charger.status}
                              </span>
                            </div>
                            <Button
                              onClick={() => handleStatusToggle(charger)}
                              variant={charger.status === 'offline' ? 'outline' : 'destructive'}
                              size="sm"
                            >
                              {charger.status === 'offline' ? 'Set Available' : 'Mark Offline'}
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-[#A7BEB5]">No chargers found for this station.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
