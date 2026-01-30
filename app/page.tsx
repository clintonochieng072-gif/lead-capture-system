import React from 'react';
import HeroCTAs from '../components/HeroCTAs';
import HeaderCTAs from '../components/HeaderCTAs';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900">
      <header className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold">LF</div>
          <span className="font-semibold text-lg">LeadFlow</span>
        </div>
        <nav className="flex items-center gap-6">
          <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition">Features</a>
          <a href="#use-cases" className="text-sm text-gray-600 hover:text-gray-900 transition">Use Cases</a>
          <HeaderCTAs />
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-12 grid gap-10 md:grid-cols-2 items-center">
        <div className="space-y-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">Capture Every Single Opportunity</h1>
          <p className="text-lg text-gray-600 max-w-xl">Transform passive visitors into valuable connections. The elegant, micro-SaaS solution for modern lead capture.</p>

          <div className="mt-4">
            <HeroCTAs />
          </div>

          <div className="mt-6 flex items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-3">
              <svg className="h-6 w-6 text-green-500" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>One-click setup • Customizable URL</span>
            </div>

            <div className="flex items-center gap-3">
              <svg className="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none"><path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>Fast, private, and reliable</span>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-tr from-purple-500 to-pink-400 p-8 text-white">
              <h3 className="text-lg font-semibold">LeadFlow — Instant Lead Pages</h3>
              <p className="mt-2 text-sm opacity-90">Beautiful, fast capture pages that send leads straight to your dashboard.</p>
            </div>
            <img src="https://images.unsplash.com/photo-1559526324-593bc073d938?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=0" alt="Abstract growth" className="w-full h-64 object-cover"/>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="bg-white p-6 rounded-2xl shadow">
            <h4 className="font-semibold text-lg">Instant Deployment</h4>
            <p className="mt-2 text-gray-600">One-click setup, customizable URL, instant activation. Launch in seconds.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow">
            <h4 className="font-semibold text-lg">Intelligent Routing</h4>
            <p className="mt-2 text-gray-600">Auto-redirect, welcome messages, seamless handoff—smart routing for real engagement.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow">
            <h4 className="font-semibold text-lg">Secure Data Haven</h4>
            <p className="mt-2 text-gray-600">Encrypted storage, private dashboard, and easy export—your data stays yours.</p>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid gap-8 md:grid-cols-2 items-center">
          <div>
            <h3 className="text-2xl font-semibold">Built for small businesses, consultancies, and creative agencies</h3>
            <p className="mt-3 text-gray-600">LeadFlow gives you a professional way to capture visitor intent without intrusive modals or clunky forms. Privacy-first by design.</p>
            <p className="mt-4 text-sm font-medium text-gray-700">Privacy First — Data is never shared, sold, or compromised.</p>
          </div>
          <div>
            <img src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=0" alt="Entrepreneur at work" className="w-full rounded-2xl shadow-lg object-cover h-64"/>
          </div>
        </div>
      </section>

      {/* Analytics Preview */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <h3 className="text-2xl font-semibold text-center">Analytics & Dashboard Preview</h3>
        <p className="text-center text-gray-600 mt-2 max-w-2xl mx-auto">Real-time metrics, lead lists, and quick exports so you can follow up instantly.</p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="bg-white p-6 rounded-2xl shadow">
            <div className="text-sm text-gray-500">Leads Today</div>
            <div className="text-2xl font-bold mt-2">24</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow">
            <div className="text-sm text-gray-500">Conversion Rate</div>
            <div className="text-2xl font-bold mt-2">6.8%</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow">
            <div className="text-sm text-gray-500">Active Links</div>
            <div className="text-2xl font-bold mt-2">8</div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-7xl mx-auto px-6 py-12 text-center">
        <h2 className="text-3xl font-bold">Start Your Journey Today</h2>
        <p className="mt-2 text-gray-600">Join a community of thoughtful businesses who value connection over noise.</p>
        <div className="mt-6 flex justify-center">
          <HeroCTAs />
        </div>
        <p className="mt-3 text-sm text-gray-500">No credit card required • Cancel anytime</p>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white mt-12">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between">
          <div className="text-sm text-gray-600">© 2026 LeadFlow. All rights reserved.</div>
          <div className="flex items-center gap-6 mt-4 md:mt-0">
            <a href="/" className="text-sm text-gray-600">Home</a>
            <a href="/dashboard" className="text-sm text-gray-600">Dashboard</a>
            <a href="/login" className="text-sm text-gray-600">Login</a>
            <a href="mailto:support@leadflow.com" className="text-sm text-gray-600">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
