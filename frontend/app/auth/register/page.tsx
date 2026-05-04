'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { handleApiError } from '@/lib/api';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const { signup } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signup(email, password, fullName, phone || undefined);
      router.push('/profile');
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#F2F2F0] text-[#000D0C] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-[#4C736F]/20 bg-[#ffffff]/95 p-8 shadow-[0_24px_80px_rgba(0,13,12,.15)]">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.3em] text-[#4C736F]">Create account</p>
          <h1 className="mt-4 text-3xl font-semibold text-[#000D0C]">Register for EVCharge</h1>
          <p className="mt-2 text-sm leading-6 text-[#012623]">
            Set up your account to manage charging sessions and station access.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-medium text-[#012623]" htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="mt-3 block w-full rounded-2xl border border-[#4C736F] bg-[#F2F2F0] px-4 py-3 text-[#000D0C] placeholder:text-[#718681] outline-none transition focus:border-[#4C736F] focus:ring-2 focus:ring-[#4C736F]/30"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#012623]" htmlFor="phone">
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-3 block w-full rounded-2xl border border-[#4C736F] bg-[#F2F2F0] px-4 py-3 text-[#000D0C] placeholder:text-[#718681] outline-none transition focus:border-[#4C736F] focus:ring-2 focus:ring-[#4C736F]/30"
              placeholder="05XX XXX XX XX (optional)"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#012623]" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-3 block w-full rounded-2xl border border-[#4C736F] bg-[#F2F2F0] px-4 py-3 text-[#000D0C] placeholder:text-[#718681] outline-none transition focus:border-[#4C736F] focus:ring-2 focus:ring-[#4C736F]/30"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#012623]" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-3 block w-full rounded-2xl border border-[#4C736F] bg-[#F2F2F0] px-4 py-3 text-[#000D0C] placeholder:text-[#718681] outline-none transition focus:border-[#4C736F] focus:ring-2 focus:ring-[#4C736F]/30"
              placeholder="Create a password"
            />
          </div>

          {error ? (
            <p className="rounded-2xl border border-[#b94f4f] bg-[#b94f4f]/10 px-4 py-3 text-sm text-[#ffd6d6]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center rounded-2xl bg-[#4C736F] px-4 py-3 text-sm font-semibold text-[#F2F2F0] transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#5a847f] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#012623]">
          Already registered?{' '}
          <Link
            href="/auth/login"
            className="font-semibold text-[#000D0C] transition duration-200 ease-out hover:text-[#3a625f] hover:underline hover:underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
