"use client";

import React from 'react';
import Link from 'next/link';

export default function HeroCTAs() {
  return (
    <div className="flex items-center">
      <Link 
        href="/login" 
        className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-7 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
      >
        Sign In
      </Link>
    </div>
  );
}
