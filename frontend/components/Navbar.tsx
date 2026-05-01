'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[#4C736F]/10 bg-[#012623] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#4C736F] group-hover:bg-[#4C736F]/90 transition-colors">
              <Zap className="w-6 h-6 text-[#F2F2F0]" />
            </div>
            <span className="text-xl font-bold text-[#F2F2F0] hidden sm:inline">
              EVCharge
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/stations"
              className="text-[#D9D5D2] hover:text-[#F2F2F0] transition-colors font-medium"
            >
              Stations
            </Link>
            <Link
              href="/pricing"
              className="text-[#D9D5D2] hover:text-[#F2F2F0] transition-colors font-medium"
            >
              Pricing
            </Link>
            <Link
              href="/about"
              className="text-[#D9D5D2] hover:text-[#F2F2F0] transition-colors font-medium"
            >
              About
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-[#D9D5D2] text-sm hidden sm:inline">
                  {user?.full_name}
                </span>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  className="text-[#D9D5D2] hover:text-[#F2F2F0] hover:bg-[#012623]"
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button
                    variant="ghost"
                    className="cursor-pointer text-[#D9D5D2] hover:text-[#F2F2F0] hover:bg-[#012623]"
                  >
                    Login
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button className="cursor-pointer bg-[#4C736F] hover:bg-[#4C736F]/90 text-[#F2F2F0] font-medium">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
