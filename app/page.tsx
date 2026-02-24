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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 text-gray-900">
      {/* Header */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
              DB
            </div>
            <span className="font-bold text-xl text-gray-900">Direct Buyer Access</span>
          </div>
          <a
            href="/login"
            className="inline-flex w-full sm:w-auto min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
          >
            Check What&apos;s on Offer
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <div className="text-center max-w-4xl mx-auto space-y-8">
          <div className="space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-gray-900">
              From struggling to find clients…<br />
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                to closing deals daily
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Direct Buyer Access helps business owners connect with potential buyers quickly and safely. Start capturing leads and closing more deals today.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="/login"
              className="inline-flex w-full sm:w-auto min-h-[56px] items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
            >
              Start My Transformation
            </a>
            <a
              href="/login"
              className="inline-flex w-full sm:w-auto min-h-[56px] items-center justify-center rounded-xl border-2 border-gray-300 bg-white px-8 py-4 text-base font-semibold text-gray-800 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:border-gray-400"
            >
              See Plans & Pricing
            </a>
          </div>

          <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 bg-green-50 border border-green-200 rounded-full px-6 py-3 shadow-sm">
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Join hundreds of business owners connecting with buyers daily
          </div>
        </div>
      </section>

      {/* Before & After Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {/* Before Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 p-8 sm:p-10 shadow-xl transition-all duration-300 hover:shadow-2xl">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-red-400/20 to-orange-400/20 rounded-full blur-3xl" />
            <div className="relative space-y-4">
              <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Before
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                No calls.<br />No buyer conversations.
              </h2>
              <p className="text-base text-gray-700 leading-relaxed">
                Business owners spend hours searching for leads, posting on social media, and waiting for the phone to ring. Days pass with empty pipelines and missed opportunities.
              </p>
              <div className="pt-4 space-y-2">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Struggling to find interested buyers
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Wasting time on unqualified leads
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Missing out on revenue growth
                </div>
              </div>
            </div>
          </div>

          {/* After Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-green-100 p-8 sm:p-10 shadow-xl transition-all duration-300 hover:shadow-2xl">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-green-400/30 to-emerald-400/30 rounded-full blur-3xl" />
            <div className="relative space-y-4">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                After
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                More calls.<br />More deals. Real growth.
              </h2>
              <p className="text-base text-gray-700 leading-relaxed">
                With Direct Buyer Access, every visitor becomes a potential lead. Capture contact details effortlessly, follow up quickly, and watch your sales pipeline fill with opportunities.
              </p>
              <div className="pt-4 space-y-2">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Automatic lead capture from every visitor
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Connect with qualified buyers instantly
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Close more deals and grow revenue
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transition Badge */}
        <div className="flex justify-center mt-8">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-full font-semibold text-sm shadow-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            Your transformation starts here
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 lg:p-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to capture leads and close deals
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Simple, secure, and designed for business owners who want to grow their customer base fast.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Capture Every Lead</h3>
              <p className="text-gray-600">
                Automatically collect contact information from visitors interested in your products or services.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Start Conversations</h3>
              <p className="text-gray-600">
                Get instant access to phone numbers so you can reach out and start meaningful buyer conversations.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Close More Deals</h3>
              <p className="text-gray-600">
                Turn website visitors into paying customers with a proven lead capture and follow-up system.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white shadow-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">100% Secure</h3>
              <p className="text-gray-600">
                Your leads&apos; information is protected with enterprise-grade security. No spam, no data sharing.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white shadow-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Lightning Fast Setup</h3>
              <p className="text-gray-600">
                Get your lead capture page up and running in minutes. No technical skills required.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Track Your Growth</h3>
              <p className="text-gray-600">
                Monitor your lead flow with a simple dashboard that shows you what&apos;s working and where to improve.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-12 sm:p-16 lg:p-20 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          
          <div className="relative text-center space-y-8">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
              Ready to transform your business?
            </h2>
            <p className="text-xl text-indigo-100 max-w-2xl mx-auto">
              Join hundreds of business owners already using Direct Buyer Access to capture leads and close deals every day.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <a
                href="/login"
                className="inline-flex w-full sm:w-auto min-h-[56px] items-center justify-center rounded-xl bg-white px-8 py-4 text-base font-bold text-indigo-600 shadow-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
              >
                Get Started Now
              </a>
              <a
                href="/login"
                className="inline-flex w-full sm:w-auto min-h-[56px] items-center justify-center rounded-xl border-2 border-white bg-transparent px-8 py-4 text-base font-semibold text-white transition-all duration-200 hover:bg-white/10"
              >
                View Demo
              </a>
            </div>

            <p className="text-sm text-indigo-100 pt-4">
              No credit card required • 7-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-200">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center text-white font-bold shadow-lg">
              DB
            </div>
            <span className="font-bold text-xl text-gray-900">Direct Buyer Access</span>
          </div>
          <p className="text-sm text-gray-600">
            © 2026 Direct Buyer Access. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
