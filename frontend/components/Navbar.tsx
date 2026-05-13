'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Zap, ChevronDown, User, Wallet, Car, LogOut, Settings, Shield } from 'lucide-react';

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            {(!isAuthenticated || user?.role === 'driver') && (
              <Link
                href="/"
                className="text-[#D9D5D2] hover:text-[#F2F2F0] transition-colors font-medium"
              >
                Map
              </Link>
            )}
            {(!isAuthenticated || user?.role === 'driver') && (
              <Link
                href="/stations"
                className="text-[#D9D5D2] hover:text-[#F2F2F0] transition-colors font-medium"
              >
                Stations
              </Link>
            )}
            {isAuthenticated && user?.role === 'driver' && (
              <Link
                href="/reservations"
                className="text-[#D9D5D2] hover:text-[#F2F2F0] transition-colors font-medium"
              >
                Reservations
              </Link>
            )}
            {isAuthenticated && user?.role === 'operator' && (
              <Link
                href="/operator"
                className="text-[#D9D5D2] hover:text-[#F2F2F0] transition-colors font-medium"
              >
                Operator Dashboard
              </Link>
            )}
            {isAuthenticated && user?.role === 'admin' && (
              <Link
                href="/admin"
                className="text-[#D9D5D2] hover:text-[#F2F2F0] transition-colors font-medium"
              >
                Admin Dashboard
              </Link>
            )}
            {isAuthenticated && (
              <Link
                href="/notifications"
                className="text-[#D9D5D2] hover:text-[#F2F2F0] transition-colors font-medium"
              >
                Notifications
              </Link>
            )}
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 text-[#D9D5D2] hover:text-[#F2F2F0] transition-colors focus:outline-none"
                >
                  <span className="text-sm font-medium hidden sm:inline">
                    {user?.full_name}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-[#031712] border border-[#4C736F]/30 shadow-lg py-2 z-50">
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[#D9D5D2] hover:bg-[#062C24] hover:text-[#F2F2F0] transition-colors"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                    {user?.role === 'driver' && (
                      <>
                        <Link
                          href="/wallet"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-[#D9D5D2] hover:bg-[#062C24] hover:text-[#F2F2F0] transition-colors"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <Wallet className="w-4 h-4" />
                          Wallet
                        </Link>
                        <Link
                          href="/vehicles"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-[#D9D5D2] hover:bg-[#062C24] hover:text-[#F2F2F0] transition-colors"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <Car className="w-4 h-4" />
                          My Vehicles
                        </Link>
                      </>
                    )}
                    <div className="border-t border-[#4C736F]/30 my-2"></div>
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#D9D5D2] hover:bg-[#062C24] hover:text-[#F2F2F0] transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
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
