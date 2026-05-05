'use client';

import Link from 'next/link';
import { ArrowLeft, Bell } from 'lucide-react';

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-[#000D0C] text-[#F2F2F0]">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#70B4A6] transition hover:text-[#6BC0A4]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to map
        </Link>

        <div className="mt-16 flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#4C736F] bg-[#062C24]">
            <Bell className="h-10 w-10 text-[#70B4A6]" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold text-white">Notifications</h1>
          <p className="mt-4 max-w-md text-[#A7BEB5]">
            This function has not been implemented yet.
          </p>
        </div>
      </div>
    </div>
  );
}
