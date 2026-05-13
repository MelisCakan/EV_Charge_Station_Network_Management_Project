'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { notificationApi, handleApiError } from '@/lib/api';
import { Bell, CheckCircle, AlertTriangle, Zap, Wallet, Wrench, XCircle, Clock, FileWarning, RefreshCw } from 'lucide-react';

interface Notification {
  id: number;
  user_id: number;
  message: string;
  type: string;
  sent_at: string;
  is_read: boolean;
}

const typeConfig: Record<string, { icon: typeof Bell; color: string; label: string }> = {
  reservation_confirm: { icon: CheckCircle, color: 'text-green-400', label: 'Reservation' },
  reservation_cancel: { icon: XCircle, color: 'text-red-400', label: 'Cancellation' },
  charging_complete: { icon: Zap, color: 'text-blue-400', label: 'Charging' },
  low_balance: { icon: Wallet, color: 'text-yellow-400', label: 'Wallet' },
  maintenance: { icon: Wrench, color: 'text-orange-400', label: 'Maintenance' },
  no_show: { icon: Clock, color: 'text-red-400', label: 'No-Show' },
  issue_reported: { icon: FileWarning, color: 'text-orange-400', label: 'Issue Report' },
  issue_update: { icon: RefreshCw, color: 'text-cyan-400', label: 'Issue Update' },
};

export default function NotificationsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    async function load() {
      setLoading(true);
      try {
        const data = await notificationApi.list();
        const utc = (ds: string) => ds && !ds.endsWith('Z') ? ds + 'Z' : ds;
        const sorted = data.sort((a: Notification, b: Notification) =>
          new Date(utc(b.sent_at)).getTime() - new Date(utc(a.sent_at)).getTime()
        );
        setNotifications(sorted);
      } catch (err) {
        setError(handleApiError(err).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isAuthenticated]);

  const handleMarkRead = async (id: number) => {
    try {
      await notificationApi.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark as read:', handleApiError(err).message);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => notificationApi.markRead(n.id).catch(() => {})));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const toUTC = (ds: string) => ds && !ds.endsWith('Z') ? ds + 'Z' : ds;
  const formatDate = (ds: string) => new Date(toUTC(ds)).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] flex items-center justify-center">
        <p className="text-lg">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] py-10">
      <div className="mx-auto max-w-3xl px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[#70B4A6]">Updates</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Notifications</h1>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="rounded-2xl border border-[#4C736F] bg-[#062C24] px-4 py-2 text-sm font-medium text-[#6BC0A4] transition hover:bg-[#0B3E34]"
            >
              Mark all as read ({unreadCount})
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-[#D45D5D]/40 bg-[#3F1818]/50 px-4 py-3 text-sm text-[#F2D1D1]">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {notifications.length === 0 && !error ? (
            <div className="rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-10 text-center shadow-lg">
              <Bell className="mx-auto h-12 w-12 text-[#4C736F] mb-4" />
              <p className="text-lg text-[#D9D5D2]">No notifications yet.</p>
              <p className="mt-2 text-sm text-[#A7BEB5]">You will be notified about reservations, charging sessions, and more.</p>
            </div>
          ) : (
            notifications.map(notification => {
              const config = typeConfig[notification.type] || { icon: Bell, color: 'text-[#70B4A6]', label: notification.type };
              const Icon = config.icon;

              return (
                <div
                  key={notification.id}
                  className={`rounded-[20px] border p-5 shadow-lg transition ${
                    notification.is_read
                      ? 'border-[#18423b]/50 bg-[#031712]/70'
                      : 'border-[#4C736F]/60 bg-[#062C24]/90'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`mt-0.5 shrink-0 ${config.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                          notification.is_read
                            ? 'bg-[#18423b]/50 text-[#A7BEB5]'
                            : 'bg-[#4C736F]/30 text-[#6BC0A4]'
                        }`}>
                          {config.label}
                        </span>
                        {!notification.is_read && (
                          <span className="w-2 h-2 rounded-full bg-[#6BC0A4]" />
                        )}
                        <span className="text-xs text-[#A7BEB5] ml-auto">{formatDate(notification.sent_at)}</span>
                      </div>
                      <p className={`text-sm ${notification.is_read ? 'text-[#A7BEB5]' : 'text-[#F2F2F0]'}`}>
                        {notification.message}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <button
                        onClick={() => handleMarkRead(notification.id)}
                        className="shrink-0 rounded-xl border border-[#4C736F]/40 px-3 py-1.5 text-xs text-[#A7BEB5] hover:bg-[#0B3E34] hover:text-white transition"
                      >
                        Read
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
