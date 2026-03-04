"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabaseClient from '../../lib/supabaseClient';

export default function CompleteProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // on mount make sure user is signed in and doesn't already have a number
  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      if (!session?.user) {
        router.push('/');
        return;
      }

      setSession(session);

      const { data: profile, error: profErr } = await supabaseClient
        .from<import('../../lib/types').Profile>('profiles')
        .select('phone_number')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (profErr) {
        console.error('Error fetching profile:', profErr);
      }

      if (profile?.phone_number && String(profile.phone_number).trim() !== '') {
        // user already completed profile
        router.push('/dashboard');
        return;
      }

      setLoading(false);
    };

    init();
  }, [router]);

  const validatePhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length < 10) return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validatePhone(phone)) {
      setError('Please enter a valid phone number (at least 10 digits)');
      return;
    }

    const digitsOnly = phone.replace(/\D/g, '');
    setLoading(true);

    const { error: updateErr } = await supabaseClient
      .from('profiles')
      .update({ phone_number: digitsOnly })
      .eq('user_id', session.user.id);

    if (updateErr) {
      console.error('Phone update error:', updateErr);
      setError('Failed to save phone number');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-10 w-10 rounded-full border-4 border-[#457B9D]/20 border-t-[#457B9D] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-20">
      <h1 className="text-2xl font-bold mb-4">Complete your profile</h1>
      <p className="mb-6 text-gray-700">We just need your phone number to get started.</p>

      {error && <p className="text-red-600 mb-2">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="phone" className="block font-medium">
            Phone number
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 block w-full border rounded p-2"
            required
          />
        </div>
        <button
          type="submit"
          className="btn-primary px-6 py-2"
          disabled={loading}
        >
          Save &amp; Continue
        </button>
      </form>
    </div>
  );
}
