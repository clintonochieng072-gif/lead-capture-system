'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import supabaseClient from '../../lib/supabaseClient';
import { getUserTrackingLinks, getUserLeads, updateTrackingLinkTarget } from '../../lib/db';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<any>(null);
  const [hasPaid, setHasPaid] = React.useState(false);
  const [links, setLinks] = React.useState<any[]>([]);
  const [leads, setLeads] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);
  const [earlyFull, setEarlyFull] = React.useState(false);
  const [payingPlan, setPayingPlan] = React.useState<string | null>(null);

  const refreshDashboard = React.useCallback(async () => {
      setLoading(true);
      const { data: { session } } = await supabaseClient.auth.getSession();

      if (!session?.user) {
        router.push('/');
        return;
      }

      setUser(session.user);
      setSyncing(true);

      try {
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (!profile) {
          // Retrieve referral ID from sessionStorage if it exists
          const referrerId = typeof window !== 'undefined' ? sessionStorage.getItem('referrer_id') : null;
          
          await fetch('/api/auth/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: session.user.id,
              email: session.user.email,
              fullName: session.user.user_metadata?.full_name,
              referrerId: referrerId || undefined
            })
          });

          // Clear referral ID after use
          if (referrerId && typeof window !== 'undefined') {
            sessionStorage.removeItem('referrer_id');
          }
        }

        const paid = Boolean(profile?.has_paid ?? profile?.subscription_active);
        setHasPaid(paid);

        const linksData = await getUserTrackingLinks(session.user.id);
        setLinks(linksData);

        const leadsData = await getUserLeads(session.user.id);
        setLeads(leadsData);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setSyncing(false);
        setLoading(false);
      }
    }, [router]);

  React.useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscription') === 'success') {
      // Refresh state after payment so gated features unlock immediately.
      refreshDashboard();
    }
  }, [refreshDashboard]);

  React.useEffect(() => {
    // Early Access is limited to the first 10 active subscribers.
    // This client-side check disables the plan; the server enforces the limit.
    const checkEarly = async () => {
      try {
        const { data, error } = await supabaseClient
          .from('profiles')
          .select('user_id')
          .eq('plan', 'Early Access')
          .eq('subscription_active', true);
        if (error) {
          console.error('Supabase check error', error);
          return;
        }
        setEarlyFull((data || []).length >= 10);
      } catch (err) {
        console.error('checkEarly error', err);
      }
    };
    checkEarly();
  }, []);

  const handleActivate = async (planName: string) => {
    if (!user?.id) return;
    setPayingPlan(planName);
    try {
      const res = await fetch('/api/init-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planName, userId: user.id })
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Error initializing payment');
        return;
      }
      if (json.authorization_url) {
        window.location.href = json.authorization_url;
      } else {
        alert('No authorization URL returned');
      }
    } catch (err) {
      console.error('init-subscription error', err);
      alert('Server error');
    } finally {
      setPayingPlan(null);
    }
  };

  const handleUpdateTarget = async (linkId: string) => {
    if (!hasPaid) {
      // Prevent configuration when subscription is inactive.
      return;
    }
    const newUrl = prompt('Enter website URL (e.g., https://example.com)');
    if (!newUrl) return;

    try {
      const result = await updateTrackingLinkTarget(linkId, user.id, newUrl);
      if (result.error) {
        alert(`Error: ${result.error}`);
        return;
      }

      setLinks(links.map(l => l.id === linkId ? { ...l, target_url: newUrl } : l));
      alert('Target URL updated!');
    } catch (error) {
      alert('Failed to update');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied!');
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="text-gray-600">Loading...</div></div>;
  }

  const leadsByLink: Record<string, any[]> = {};
  leads.forEach(lead => {
    if (!leadsByLink[lead.tracking_link_id]) {
      leadsByLink[lead.tracking_link_id] = [];
    }
    leadsByLink[lead.tracking_link_id].push(lead);
  });

  return (
    <div className="space-y-6 sm:space-y-8 px-4 sm:px-0">
      {!hasPaid && (
        <section className="card border border-yellow-200 bg-yellow-50">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Your account is inactive</h2>
          <p className="mt-2 text-sm sm:text-base text-gray-700">
            Activate your subscription to connect your website, capture leads, and manage them from your dashboard.
          </p>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="mt-4 btn-primary w-full sm:w-auto"
          >
            Activate Account
          </button>
        </section>
      )}

      <section className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
          Welcome, {user?.user_metadata?.full_name || user?.email}
        </h2>
        <p className="mt-2 text-sm sm:text-base text-gray-600">Manage your tracking links and monitor leads.</p>
      </section>

      <section className="card">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Tracking Links</h2>
          <p className="text-sm sm:text-base text-gray-600">{links.length} link{links.length !== 1 ? 's' : ''}</p>
        </div>

        {links.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 py-8 text-center">
            <p className="text-sm sm:text-base text-gray-600">No links yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {links.map(link => (
              <div key={link.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4 sm:p-5">
                <div className="mb-3 flex flex-col sm:flex-row sm:justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{link.slug}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">{link.label}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full self-start ${
                    link.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800'
                  }`}>
                    {link.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mb-4 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Target</p>
                    <input
                      type="url"
                      className="w-full bg-white px-3 py-2 text-xs sm:text-sm rounded border border-gray-300 text-gray-700"
                      value={link.target_url || ''}
                      placeholder="https://example.com"
                      disabled={!hasPaid || syncing}
                      readOnly
                    />
                    {/* Explain what the Target URL does for new users */}
                    <p className="mt-1 text-xs text-gray-500">
                      Set your website URL. After a visitor submits their details, they will be redirected to this URL.
                    </p>
                    {!hasPaid && (
                      // Disabled until payment is active to prevent configuring value-delivering features
                      <p className="mt-1 text-xs text-gray-500">
                        Activate your account to connect your website and start capturing leads.
                      </p>
                    )}
                  </div>

                  {hasPaid && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">Share</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <code className="flex-1 bg-white px-3 py-2 text-xs rounded border border-gray-300 text-gray-700 overflow-x-auto whitespace-nowrap">
                          {typeof window !== 'undefined' ? `${window.location.origin}/t/${link.slug}` : `/t/${link.slug}`}
                        </code>
                        <button onClick={() => copyToClipboard(typeof window !== 'undefined' ? `${window.location.origin}/t/${link.slug}` : `/t/${link.slug}`)} className="btn-secondary text-sm whitespace-nowrap">
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleUpdateTarget(link.id)}
                  className="btn-primary text-sm w-full sm:w-auto"
                  disabled={!hasPaid || syncing}
                >
                  Set Target URL
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-4 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-bold">Activate your account</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none p-1">
                ✕
              </button>
            </div>
            <p className="text-xs sm:text-sm text-gray-600">Choose a plan to unlock your lead capture tools.</p>

            <div className="mt-4 sm:mt-6 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              <div className={`rounded-lg border p-4 ${earlyFull ? 'opacity-60' : ''}`}>
                <h4 className="text-base sm:text-lg font-semibold">Early Access Plan</h4>
                <p className="text-sm text-gray-600">KES 499 / month</p>
                <p className="mt-2 text-xs text-gray-500">Limited to the first 10 users.</p>
                <button
                  className="mt-4 btn-primary w-full text-sm sm:text-base"
                  disabled={earlyFull || payingPlan === 'Early Access'}
                  onClick={() => handleActivate('Early Access')}
                >
                  {earlyFull ? 'Limit Reached' : payingPlan === 'Early Access' ? 'Processing…' : 'Pay Now'}
                </button>
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="text-base sm:text-lg font-semibold">Standard Plan</h4>
                <p className="text-sm text-gray-600">KES 999 / month</p>
                <p className="mt-2 text-xs text-gray-500">Unlimited access.</p>
                <button
                  className="mt-4 btn-primary w-full text-sm sm:text-base"
                  disabled={payingPlan === 'Standard'}
                  onClick={() => handleActivate('Standard')}
                >
                  {payingPlan === 'Standard' ? 'Processing…' : 'Pay Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="card">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Captured Leads</h2>
          <p className="text-sm sm:text-base text-gray-600">{leads.length} lead{leads.length !== 1 ? 's' : ''}</p>
        </div>

        {leads.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 py-8 text-center">
            <p className="text-sm sm:text-base text-gray-600">No leads yet. Share your link!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {links.map(link => {
              const linkLeads = leadsByLink[link.id] || [];
              if (linkLeads.length === 0) return null;

              return (
                <div key={link.id}>
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-3">
                    {link.slug} ({linkLeads.length} lead{linkLeads.length !== 1 ? 's' : ''})
                  </h3>
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <table className="w-full text-xs sm:text-sm min-w-[500px]">
                      <thead className="border-b border-gray-200 bg-gray-50">
                        <tr>
                          <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-900">Name</th>
                          <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-900">Phone</th>
                          <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-900">When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {linkLeads.map(lead => (
                          <tr key={lead.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-3 sm:px-4 py-3 font-medium text-gray-900">{lead.name}</td>
                            <td className="px-3 sm:px-4 py-3 text-gray-700">{lead.phone}</td>
                            <td className="px-3 sm:px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                              {new Date(lead.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
