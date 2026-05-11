'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { operatorApi, stationApi, handleApiError } from '@/lib/api';
import { ChargingStation, Charger } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Wrench } from 'lucide-react';

export default function OperatorDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [issues, setIssues] = useState<any[]>([]);
  const [stations, setStations] = useState<ChargingStation[]>([]);
  const [chargers, setChargers] = useState<Record<string, Charger[]>>({});

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || user?.role !== 'operator') {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'operator') return;
    
    async function loadData() {
      try {
        const [issuesData, stationsData] = await Promise.all([
          operatorApi.getIssues(),
          stationApi.list()
        ]);
        setIssues(issuesData);
        setStations(stationsData);
        
        const chargersMap: Record<string, Charger[]> = {};
        for (const station of stationsData) {
          const stationChargers = await stationApi.chargers(String(station.id));
          chargersMap[station.id] = stationChargers;
        }
        setChargers(chargersMap);
      } catch (error) {
        console.error('Failed to load operator data', handleApiError(error));
      }
    }
    loadData();
  }, [isAuthenticated, user]);

  const handleStatusToggle = async (charger: Charger) => {
    const newStatus = charger.status === 'offline' ? 'available' : 'offline';
    if (newStatus === 'offline' && !window.confirm('Marking this charger offline will automatically cancel affected reservations and refund users. Proceed?')) {
      return;
    }
    try {
      await operatorApi.updateChargerStatus(charger.id, newStatus);
      setChargers(prev => {
        const updated = { ...prev };
        updated[charger.station_id] = updated[charger.station_id].map(c => 
          c.id === charger.id ? { ...c, status: newStatus as any } : c
        );
        return updated;
      });
    } catch (error) {
      alert('Failed to update charger status: ' + handleApiError(error).message);
    }
  };

  const handleResolveIssue = async (issueId: number) => {
    try {
      await operatorApi.resolveIssue(issueId);
      setIssues(issues.filter(i => i.id !== issueId));
    } catch (err) {
      alert('Failed to resolve issue: ' + handleApiError(err).message);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] p-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] py-10">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-sm uppercase tracking-[0.24em] text-[#70B4A6]">Management</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Operator Dashboard</h1>

        {/* Issues Overview */}
        <div className="mt-8 rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-6 shadow-lg">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4"><AlertTriangle className="text-yellow-500"/> Reported Issues</h2>
          <div className="space-y-3">
            {issues.length === 0 ? <p className="text-[#A7BEB5]">No reported issues.</p> : issues.map(issue => (
              <div key={issue.id} className="p-4 rounded-2xl bg-[#062C24] border border-[#4C736F] flex justify-between items-center">
                <div>
                  <p className="font-medium text-white">{issue.description}</p>
                  <p className="text-xs text-[#A7BEB5]">Charger ID: {issue.charger_id} | Status: {issue.status}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => handleResolveIssue(issue.id)}>Resolve</Button>
              </div>
            ))}
          </div>
        </div>

        {/* Station Management */}
        <div className="mt-8 rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-6 shadow-lg">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4"><Wrench className="text-[#6BC0A4]"/> Charger Maintenance</h2>
          {stations.length === 0 ? (
            <p className="text-[#A7BEB5]">No stations available for maintenance.</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {stations.map(station => (
                <div key={station.id} className="p-5 rounded-2xl bg-[#062C24] border border-[#4C736F]">
                  <h3 className="text-lg font-medium text-white mb-3">{station.name}</h3>
                  <div className="space-y-3">
                    {chargers[station.id] && chargers[station.id].length > 0 ? (
                      chargers[station.id].map(charger => (
                        <div key={charger.id} className="flex justify-between items-center bg-[#031B18] p-3 rounded-xl border border-[#18423b]">
                          <span className="text-sm font-medium flex items-center flex-wrap gap-2">
                            {charger.charger_code} ({charger.power_output}kW) 
                            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${charger.status === 'available' ? 'bg-green-500/20 text-green-400' : charger.status === 'offline' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{charger.status}</span>
                          </span>
                          <Button onClick={() => handleStatusToggle(charger)} variant={charger.status === 'offline' ? 'outline' : 'destructive'} size="sm">
                            {charger.status === 'offline' ? 'Set Available' : 'Mark Offline'}
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[#A7BEB5]">No chargers found for this station.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}