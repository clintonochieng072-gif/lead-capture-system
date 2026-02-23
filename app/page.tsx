'use client'

import React, { useEffect } from 'react';

export default function LandingPage() {
  // Capture affiliate referrer ID from URL on page load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref'); // e.g., ?ref=jWdlBtQzvE
    
    if (refParam && refParam.trim() !== '') {
      // Store referrer ID in sessionStorage so it persists through signup
      sessionStorage.setItem('referrer_id', refParam.trim());
      console.log('✅ Affiliate referrer ID captured:', refParam);
    } else {
      // No ref parameter = not an affiliate link, don't store anything
      console.log('ℹ️ No affiliate referrer - user came directly or from non-affiliate source');
    }
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900">
      <header className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold">DB</div>
          <span className="font-semibold text-lg">Direct Buyer Access</span>
        </div>
        <a
          href="/login"
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
        >
          Get Connected Now
        </a>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-10 grid gap-10 md:grid-cols-2 items-start">
        <div className="space-y-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
            Get direct phone contacts of serious buyers — not just clicks.
          </h1>

          <p className="text-lg text-gray-700 max-w-xl">
            Direct Buyer Access helps business owners connect with people who are ready to talk and buy.
            You get trusted contact details quickly, so you can close deals faster.
          </p>

          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="mt-1 text-green-600">✓</span>
              <span>Instant access to potential buyers ready to buy</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 text-green-600">✓</span>
              <span>Verified and high-intent contacts</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 text-green-600">✓</span>
              <span>Your contact info is safe — no spam</span>
            </li>
          </ul>

          <p className="text-sm font-medium text-gray-800 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            Over 50 sellers just connected with serious buyers this week.
          </p>

          <div className="flex flex-wrap gap-3">
            <a
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
            >
              Get Connected Now
            </a>
            <a
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-800 shadow-sm transition-all duration-200 hover:bg-gray-50"
            >
              Secure This Listing
            </a>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900">Visual Placeholder Suggestions</h3>
            <div className="mt-4 space-y-3 text-sm text-gray-700">
              <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2">
                [Placeholder Icon: Verified phone badge]
              </p>
              <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2">
                [Placeholder Image: Business owner on call with buyer]
              </p>
              <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2">
                [Placeholder Icon: Shield for safe contact sharing]
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
            <p className="text-sm text-indigo-900">
              Trust-first experience for business owners. Only serious buyer contacts are shared.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
