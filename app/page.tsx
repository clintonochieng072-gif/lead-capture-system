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

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-7 sm:space-y-8">
        <div className="grid gap-3 sm:gap-4 md:grid-cols-[1fr_auto_1fr] items-stretch">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 sm:p-6 flex flex-col justify-between min-h-[190px] sm:min-h-[240px]">
            <p className="text-xs font-semibold tracking-wide text-red-700 uppercase">Before</p>
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-red-100 bg-white">
                <img
                  src="https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg?auto=compress&cs=tinysrgb&w=1200"
                  alt="Business owner feeling frustrated while reviewing low sales"
                  className="h-40 w-full object-cover"
                  loading="lazy"
                />
              </div>
              <p className="text-sm sm:text-base text-red-900">No calls. No clients. Offers left unseen.</p>
            </div>
          </div>

          <div className="md:hidden flex items-center justify-center">
            <div className="rounded-full border border-indigo-200 bg-white px-4 py-2 text-xs font-semibold text-indigo-700">Before → After</div>
          </div>

          <div className="hidden md:flex items-center justify-center px-2">
            <div className="rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700">Before → After</div>
          </div>

          <div className="rounded-2xl border border-green-100 bg-green-50 p-4 sm:p-6 flex flex-col justify-between min-h-[190px] sm:min-h-[240px]">
            <p className="text-xs font-semibold tracking-wide text-green-700 uppercase">After</p>
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-green-100 bg-white">
                <img
                  src="https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=1200"
                  alt="Happy business owner closing deals and celebrating success"
                  className="h-40 w-full object-cover"
                  loading="lazy"
                />
              </div>
              <p className="text-sm sm:text-base text-green-900">More calls. Real buyer conversations. Deals closing.</p>
            </div>
          </div>
        </div>

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
      </section>
    </main>
  );
}
