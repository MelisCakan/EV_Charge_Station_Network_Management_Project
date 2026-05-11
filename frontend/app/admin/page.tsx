'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { adminApi, handleApiError } from '@/lib/api';
import { ShieldCheck, Users, Activity, Banknote } from 'lucide-react';

export default function AdminDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') return;
    adminApi.getStats()
      .then(setStats)
      .catch(err => console.error("Failed to load admin stats", handleApiError(err)));
  }, [isAuthenticated, user]);

  if (isLoading) return <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] p-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-[#6BC0A4]" />
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[#70B4A6]">System Overview</p>
            <h1 className="text-3xl font-semibold text-white">Admin Dashboard</h1>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-6 flex flex-col items-center shadow-lg">
            <Users className="w-10 h-10 text-blue-400 mb-2" />
            <p className="text-[#A7BEB5] text-sm">Total Registered Users</p>
            <p className="text-3xl font-bold text-white mt-1">{stats?.total_users || 0}</p>
          </div>
          
          <div className="rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-6 flex flex-col items-center shadow-lg">
            <Activity className="w-10 h-10 text-green-400 mb-2" />
            <p className="text-[#A7BEB5] text-sm">Active Charging Sessions</p>
            <p className="text-3xl font-bold text-white mt-1">{stats?.active_sessions || 0}</p>
          </div>

          <div className="rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-6 flex flex-col items-center shadow-lg">
            <Banknote className="w-10 h-10 text-yellow-400 mb-2" />
            <p className="text-[#A7BEB5] text-sm">Total System Revenue</p>
            <p className="text-3xl font-bold text-white mt-1">{stats?.total_revenue?.toFixed(2) || '0.00'} TL</p>
          </div>
        </div>
      </div>
    </div>
  );
}