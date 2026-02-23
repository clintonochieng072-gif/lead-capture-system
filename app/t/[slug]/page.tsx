import 'server-only';
import React from 'react';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import PublicTrackerClient from '../../../components/PublicTrackerClientFixed';

export default async function Page({ params }: { params: { slug: string } }) {
  const slug = params.slug;

  try {
    const { data: linkData, error: linkErr } = await supabaseAdmin
      .from('tracking_links')
      .select('id, owner_user_id, target_url, is_active')
      .eq('slug', slug)
      .limit(1)
      .maybeSingle();

    if (linkErr) {
      console.error('Link lookup error:', linkErr?.message || linkErr);
      return (
        <div className="max-w-xl mx-auto p-8 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold">Service temporarily unavailable</h2>
          <p className="text-sm text-gray-600">Please try again in a few moments.</p>
        </div>
      );
    }

    if (!linkData) {
      return (
        <div className="max-w-xl mx-auto p-8 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold">Page not found</h2>
          <p className="text-sm text-gray-600">This page does not exist.</p>
        </div>
      );
    }

    if (!linkData.is_active) {
      return (
        <div className="max-w-xl mx-auto p-8 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold">Page inactive</h2>
          <p className="text-sm text-gray-600">This page is no longer active.</p>
        </div>
      );
    }

    if (!linkData.target_url) {
      return (
        <div className="max-w-xl mx-auto p-8 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold">Target URL not set</h2>
          <p className="text-sm text-gray-600">The owner has not configured a destination yet.</p>
        </div>
      );
    }

    // Render client component with the resolved target URL so submit can redirect immediately
    return <PublicTrackerClient slug={slug} targetUrl={linkData.target_url} />;
  } catch (err) {
    console.error('Track page error:', err);
    return (
      <div className="max-w-xl mx-auto p-8 bg-white rounded-lg shadow">
        <h2 className="text-lg font-semibold">Server error</h2>
        <p className="text-sm text-gray-600">Please try again later.</p>
      </div>
    );
  }
}
