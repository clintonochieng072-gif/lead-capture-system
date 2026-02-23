'use client'

import React, { useEffect } from 'react';

export default function LandingPage() {
  const beforeImageUrl = 'https://source.unsplash.com/2400x1600/?african,business,owner,office,frustrated,phone';
  const afterImageUrl = 'https://source.unsplash.com/2400x1600/?african,business,owner,office,success,phone,deal';

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
      <header className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold">DB</div>
          <span className="font-semibold text-lg">Direct Buyer Access</span>
        </div>
        <a
          href="/login"
          className="inline-flex w-full sm:w-auto min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
        >
          Check What&apos;s on Offer
        </a>
      </header>

      <section className="w-full py-6 sm:py-10 space-y-4 sm:space-y-5">
        <div
          className="relative min-h-[52vh] sm:min-h-[58vh] bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(15, 23, 42, 0.68) 0%, rgba(15, 23, 42, 0.42) 55%, rgba(15, 23, 42, 0.2) 100%), url(${beforeImageUrl})`
          }}
          aria-label="Before: African business owner in a business setting feeling concerned while checking phone with no incoming calls"
        >
          <div className="mx-auto flex h-full max-w-6xl items-end px-4 sm:px-6 py-8 sm:py-10">
            <div className="max-w-xl space-y-3 text-white">
              <p className="text-xs font-semibold tracking-wide uppercase text-red-200">Before</p>
              <h2 className="text-2xl sm:text-3xl font-bold leading-tight">No calls. No buyer conversations.</h2>
              <p className="text-sm sm:text-base text-slate-100">A real business owner facing an empty sales day and checking a quiet phone.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 sm:px-6">
          <div className="rounded-full border border-indigo-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-indigo-700">Before → After</div>
        </div>

        <div
          className="relative min-h-[52vh] sm:min-h-[58vh] bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(6, 78, 59, 0.65) 0%, rgba(6, 78, 59, 0.38) 55%, rgba(6, 78, 59, 0.2) 100%), url(${afterImageUrl})`
          }}
          aria-label="After: African business owner smiling confidently while making calls and closing deals"
        >
          <div className="mx-auto flex h-full max-w-6xl items-end px-4 sm:px-6 py-8 sm:py-10">
            <div className="max-w-xl space-y-3 text-white">
              <p className="text-xs font-semibold tracking-wide uppercase text-emerald-200">After</p>
              <h2 className="text-2xl sm:text-3xl font-bold leading-tight">More calls. More deals. Real growth.</h2>
              <p className="text-sm sm:text-base text-emerald-50">Now the same business owner is confident, connecting with buyers, and closing opportunities.</p>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl space-y-4 sm:space-y-5">
            <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight sm:leading-tight text-balance">
              From struggling to finding clients… to closing deals and celebrating success
            </h1>

            <p className="text-base sm:text-lg text-gray-700">
              Direct Buyer Access helps business owners connect with potential buyers quickly and safely. One simple step can start your transformation.
            </p>

            <p className="text-sm sm:text-base text-gray-600">
              Capture buyer phone contacts from people visiting your page, start real conversations faster, and close more deals with confidence.
            </p>

            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
              <a
                href="/login"
                className="inline-flex w-full sm:w-auto min-h-[48px] items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
              >
                Start My Transformation
              </a>
              <a
                href="/login"
                className="inline-flex w-full sm:w-auto min-h-[48px] items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-800 shadow-sm transition-all duration-200 hover:bg-gray-50"
              >
                Check What&apos;s on Offer
              </a>
            </div>

            <p className="text-sm font-medium text-gray-800 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-center sm:text-left">
              Join hundreds of business owners already connecting with buyers — no spam, 100% secure.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
