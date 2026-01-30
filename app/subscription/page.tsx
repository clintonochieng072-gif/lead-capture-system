"use client"

import React, { useEffect, useState } from 'react'
import { supabaseClient } from '../../lib/supabaseClient'

type Plan = {
  name: string
  priceDisplay: string
}

const PLANS: Plan[] = [
  { name: 'Early Access', priceDisplay: 'KES 499 / month' },
  { name: 'Standard', priceDisplay: 'KES 999 / month' },
]

export default function SubscriptionPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [earlyFull, setEarlyFull] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Get authenticated user id
    async function fetchUser() {
      try {
        const res: any = await supabaseClient.auth.getUser()
        const user = res?.data?.user
        if (user?.id) setUserId(user.id)
      } catch (err) {
        console.error('getUser error', err)
      }
    }
    fetchUser()
  }, [])

  useEffect(() => {
    // Early Access is limited to the first 10 active subscribers.
    // This client-side check hides the plan; the server enforces the limit.
    async function checkEarly() {
      try {
        const { data, error } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('plan', 'Early Access')
          .eq('subscription_active', true)
        if (error) {
          console.error('Supabase check error', error)
          return
        }
        setEarlyFull((data || []).length >= 10)
      } catch (err) {
        console.error('checkEarly error', err)
      }
    }
    checkEarly()
  }, [])

  async function handlePay(planName: string) {
    if (!userId) {
      // Not authenticated: redirect to login or show message
      window.location.href = '/login'
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/init-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planName, userId }),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(json.error || 'Error initializing payment')
        setLoading(false)
        return
      }
      // Redirect to Paystack hosted payment page
      if (json.authorization_url) {
        window.location.href = json.authorization_url
      } else {
        alert('No authorization URL returned')
      }
    } catch (err) {
      console.error('init-subscription fetch error', err)
      alert('Server error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Choose a plan</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLANS.map((p) => {
          if (p.name === 'Early Access' && earlyFull) return null
          return (
            <div key={p.name} className="border rounded p-4">
              <h2 className="text-xl font-semibold">{p.name}</h2>
              <p className="text-gray-600">{p.priceDisplay}</p>
              <button
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
                onClick={() => handlePay(p.name)}
                disabled={loading}
              >
                {loading ? 'Processing…' : 'Pay Now'}
              </button>
            </div>
          )
        })}
      </div>
      {earlyFull && (
        <p className="mt-4 text-sm text-red-600">Early Access is currently full.</p>
      )}
    </div>
  )
}
