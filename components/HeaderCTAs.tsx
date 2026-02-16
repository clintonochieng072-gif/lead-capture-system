"use client";

import React from 'react';
import Link from 'next/link';

export default function HeaderCTAs() {
  return (
    <div className="flex items-center">
      <Link 
        href="/login"
        className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      >
        Sign In
      </Link>
    </div>
  );
}
