'use client';

import React from 'react';
import Link from 'next/link';
import { Zap } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#000D0C] border-t border-[#4C736F]/20 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#4C736F]">
                <Zap className="w-5 h-5 text-[#F2F2F0]" />
              </div>
              <span className="text-lg font-bold text-[#F2F2F0]">EVCharge</span>
            </div>
            <p className="text-[#D9D5D2] text-sm">
              Powering the future of electric vehicle charging.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-[#F2F2F0] font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/stations" className="text-[#D9D5D2] hover:text-[#F2F2F0] transition-colors">
                  Find Stations
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-[#D9D5D2] hover:text-[#F2F2F0] transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/features" className="text-[#D9D5D2] hover:text-[#F2F2F0] transition-colors">
                  Features
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-[#F2F2F0] font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-[#D9D5D2] hover:text-[#F2F2F0] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-[#D9D5D2] hover:text-[#F2F2F0] transition-colors">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-[#F2F2F0] font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-[#D9D5D2] hover:text-[#F2F2F0] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-[#D9D5D2] hover:text-[#F2F2F0] transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-[#D9D5D2] hover:text-[#F2F2F0] transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#4C736F]/20 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-[#D9D5D2] text-sm">
              © {currentYear} EVCharge Network. All rights reserved.
            </p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="text-[#D9D5D2] hover:text-[#F2F2F0] transition-colors">
                Twitter
              </a>
              <a href="#" className="text-[#D9D5D2] hover:text-[#F2F2F0] transition-colors">
                LinkedIn
              </a>
              <a href="#" className="text-[#D9D5D2] hover:text-[#F2F2F0] transition-colors">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
