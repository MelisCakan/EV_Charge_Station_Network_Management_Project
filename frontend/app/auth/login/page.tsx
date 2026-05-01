'use client';

import Link from 'next/link';
import { useState } from 'react';
import { authApi, handleApiError, setAuthToken } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const data = await authApi.login({ email, password });
      setAuthToken(data.access_token);
      window.location.href = '/';
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
          <p className="text-sm uppercase tracking-[0.3em] text-[#4C736F]">Welcome back</p>
          <h1 className="mt-4 text-3xl font-semibold text-[#000D0C]">Login to EVCharge</h1>
          <p className="mt-2 text-sm leading-6 text-[#012623]">
            Enter your credentials to access the charging network dashboard.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
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
              placeholder="••••••••"
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
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#012623]">
          Don’t have an account?{' '}
          <Link
            href="/auth/register"
            className="font-semibold text-[#000D0C] transition duration-200 ease-out hover:text-[#3a625f] hover:underline hover:underline-offset-4"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
