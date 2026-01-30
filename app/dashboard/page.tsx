'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import supabaseClient from '../../lib/supabaseClient';
import { getUserTrackingLinks, getUserLeads, updateTrackingLinkTarget } from '../../lib/db';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<any>(null);
  const [links, setLinks] = React.useState<any[]>([]);
  const [leads, setLeads] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);

  React.useEffect(() => {
    const initDashboard = async () => {
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
          .select('user_id')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (!profile) {
          await fetch('/api/auth/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: session.user.id,
              email: session.user.email,
              fullName: session.user.user_metadata?.full_name
            })
          });
        }

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
    };

    initDashboard();
  }, [router]);

  const handleUpdateTarget = async (linkId: string) => {
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
    <div className="space-y-8">
      <section className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome, {user?.user_metadata?.full_name || user?.email}
        </h2>
        <p className="mt-2 text-gray-600">Manage your tracking links and monitor leads.</p>
      </section>

      <section className="card">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Tracking Links</h2>
          <p className="text-gray-600">{links.length} link{links.length !== 1 ? 's' : ''}</p>
        </div>

        {links.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 py-8 text-center">
            <p className="text-gray-600">No links yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {links.map(link => (
              <div key={link.id} className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                <div className="mb-3 flex justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{link.slug}</h3>
                    <p className="text-sm text-gray-600">{link.label}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    link.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800'
                  }`}>
                    {link.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mb-4 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Target</p>
                    {link.target_url ? (
                      <a href={link.target_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm break-all">
                        {link.target_url}
                      </a>
                    ) : (
                      <span className="text-gray-400 italic text-sm">Not set</span>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Share</p>
                    <div className="flex gap-2">
                      <code className="flex-1 bg-white px-3 py-2 text-xs rounded border border-gray-300 text-gray-700 overflow-auto">
                        {typeof window !== 'undefined' ? `${window.location.origin}/t/${link.slug}` : `/t/${link.slug}`}
                      </code>
                      <button onClick={() => copyToClipboard(typeof window !== 'undefined' ? `${window.location.origin}/t/${link.slug}` : `/t/${link.slug}`)} className="btn-secondary text-sm">
                        Copy
                      </button>
                    </div>
                  </div>
                </div>

                <button onClick={() => handleUpdateTarget(link.id)} className="btn-primary text-sm" disabled={syncing}>
                  Set Target URL
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Captured Leads</h2>
          <p className="text-gray-600">{leads.length} lead{leads.length !== 1 ? 's' : ''}</p>
        </div>

        {leads.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 py-8 text-center">
            <p className="text-gray-600">No leads yet. Share your link!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {links.map(link => {
              const linkLeads = leadsByLink[link.id] || [];
              if (linkLeads.length === 0) return null;

              return (
                <div key={link.id}>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    {link.slug} ({linkLeads.length} lead{linkLeads.length !== 1 ? 's' : ''})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-200 bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900">Name</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900">Phone</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-900">When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {linkLeads.map(lead => (
                          <tr key={lead.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{lead.name}</td>
                            <td className="px-4 py-3 text-gray-700">{lead.phone}</td>
                            <td className="px-4 py-3 text-gray-600 text-xs">
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
