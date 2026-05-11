'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Car, Trash2, User } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { vehicleApi, handleApiError } from '@/lib/api';
import { Vehicle } from '@/lib/types';
import { Button } from '@/components/ui/button';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, updateProfile, deleteAccount, logout } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setPhone(user.phone_number || '');
      setEmail(user.email || '');
    }
  }, [user]);

  useEffect(() => {
    async function loadVehicles() {
      setVehiclesLoading(true);
      setApiError(null);

      try {
        const data = await vehicleApi.list();
        setVehicles(data || []);
      } catch (err) {
        setApiError(handleApiError(err).message);
        setVehicles([]);
      } finally {
        setVehiclesLoading(false);
      }
    }

    if (isAuthenticated) {
      loadVehicles();
    }
  }, [isAuthenticated]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    setApiError(null);

    if (!fullName.trim()) {
      setFormError('Full name is required.');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({ full_name: fullName.trim(), phone_number: phone || null, email: email.trim() });
      setSuccessMessage('Your profile has been updated.');
    } catch (err) {
      setApiError(handleApiError(err).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    setApiError(null);

    try {
      await deleteAccount();
      router.push('/');
    } catch (err) {
      setApiError(handleApiError(err).message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] flex items-center justify-center">
        <p className="text-lg">Loading your profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0] flex items-center justify-center px-4 py-10">
        <div className="max-w-md rounded-[32px] border border-[#2D564F]/80 bg-[#02110F]/95 p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
          <p className="text-lg text-[#F2F2F0]">You need to sign in to see your profile.</p>
          <Button variant="outline" className="mt-6" onClick={() => router.push('/auth/login')}>
            Go to login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[#70B4A6]">Your profile</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Welcome back, {user.full_name}</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#D9D5D2]/80">
              Manage your personal information, vehicle list, and account settings from a single page.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {user?.role === 'driver' && (
              <Button variant="ghost" className="text-[#D9D5D2] hover:text-[#F2F2F0]" onClick={() => router.push('/vehicles')}>
                Manage Vehicles
              </Button>
            )}
            <Button variant="ghost" className="text-[#D9D5D2] hover:text-[#F2F2F0]" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        <div className={`mt-8 grid gap-6 ${user?.role === 'driver' ? 'xl:grid-cols-[1.05fr_0.95fr]' : 'max-w-2xl'}`}>
          <section className="rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-8 shadow-[0_24px_70px_rgba(0,0,0,0.25)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#18423b]/80 pb-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-[#70B4A6]">Personal info</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Edit profile</h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-[#4C736F] bg-[#062C24] px-4 py-2 text-sm text-[#D9D5D2]">
                <User className="h-4 w-4 text-[#6BC0A4]" />
                {user.role}
              </div>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleSave}>
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-[#D9D5D2]">
                  Full name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="mt-3 block w-full rounded-3xl border border-[#4C736F] bg-[#031B18] px-4 py-3 text-[#F2F2F0] outline-none transition focus:border-[#6BC0A4] focus:ring-2 focus:ring-[#6BC0A4]/30"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#D9D5D2]">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-3 block w-full rounded-3xl border border-[#4C736F] bg-[#031B18] px-4 py-3 text-[#F2F2F0] outline-none transition focus:border-[#6BC0A4] focus:ring-2 focus:ring-[#6BC0A4]/30"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-[#D9D5D2]">
                  Phone number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="mt-3 block w-full rounded-3xl border border-[#4C736F] bg-[#031B18] px-4 py-3 text-[#F2F2F0] outline-none transition focus:border-[#6BC0A4] focus:ring-2 focus:ring-[#6BC0A4]/30"
                />
              </div>

              {formError && (
                <div className="rounded-3xl border border-[#D45D5D]/40 bg-[#3F1818]/50 px-4 py-3 text-sm text-[#F2D1D1]">
                  {formError}
                </div>
              )}

              {apiError && (
                <div className="rounded-3xl border border-[#D45D5D]/40 bg-[#3F1818]/50 px-4 py-3 text-sm text-[#F2D1D1]">
                  {apiError}
                </div>
              )}

              {successMessage && (
                <div className="rounded-3xl border border-[#4C736F]/40 bg-[#16382F]/50 px-4 py-3 text-sm text-[#BCE3CD]">
                  {successMessage}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                  {isSaving ? 'Saving...' : 'Save changes'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="w-full sm:w-auto"
                >
                  {isDeleting ? 'Deleting...' : 'Delete account'}
                </Button>
              </div>
            </form>
          </section>

          {user?.role === 'driver' && (
          <section className="rounded-[28px] border border-[#18423b]/80 bg-[#031712]/95 p-8 shadow-[0_24px_70px_rgba(0,0,0,0.25)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#18423b]/80 pb-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-[#70B4A6]">Vehicles</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">My registered EVs</h2>
              </div>
              <Link
                href="/vehicles"
                className="inline-flex items-center gap-2 rounded-2xl border border-[#4C736F] bg-[#062C24] px-4 py-2 text-sm font-medium text-[#D9D5D2] transition hover:border-[#6BC0A4] hover:bg-[#0D3A2F]"
              >
                <Car className="h-4 w-4" />
                Manage vehicles
              </Link>
            </div>

            <div className="mt-6 space-y-4">
              {vehiclesLoading ? (
                <div className="rounded-3xl border border-[#13423a]/80 bg-[#031912]/95 px-4 py-8 text-center text-sm text-[#D9D5D2]">
                  Loading vehicles...
                </div>
              ) : vehicles.length === 0 ? (
                <div className="rounded-3xl border border-[#13423a]/80 bg-[#031912]/95 px-4 py-8 text-center text-sm text-[#D9D5D2]">
                  No vehicles registered yet. Add your first EV from the vehicle page.
                </div>
              ) : (
                <div className="space-y-4">
                  {vehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="rounded-3xl border border-[#13423a]/80 bg-[#031912]/95 px-4 py-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-base font-semibold text-white">{vehicle.brand} {vehicle.model}</p>
                          <p className="text-sm text-[#D9D5D2]/80">{vehicle.connector_type} • {vehicle.battery_capacity} kWh</p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#062C24] px-3 py-2 text-sm text-[#D9D5D2]">
                          <span>{vehicle.plate_number}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {apiError && (
              <div className="mt-6 rounded-3xl border border-[#D45D5D]/40 bg-[#3F1818]/50 px-4 py-3 text-sm text-[#F2D1D1]">
                {apiError}
              </div>
            )}
          </section>
          )}
        </div>
      </div>
    </div>
  );
}
