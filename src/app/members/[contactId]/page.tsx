"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import MemberTimeline from "@/components/MemberTimeline";

interface MembershipRecord {
  id: string;
  properties: Record<string, string | null>;
}

interface Deal {
  id: string;
  properties: Record<string, string | null>;
}

interface MemberProfile {
  contactId: string;
  firstname: string;
  lastname: string;
  email: string;
  vtg_current_membership_tier: string | null;
  vtg_current_membership_status: string | null;
  vtg_billing_source: string | null;
  vtg_recharge_subscription_id: string | null;
  vtg_stripe_subscription_id: string | null;
  membershipRecords: MembershipRecord[];
  deals: Deal[];
}

const TIER_COLORS: Record<string, string> = {
  gold: "bg-amber-100 text-amber-700",
  silver: "bg-slate-100 text-slate-600",
  bronze: "bg-orange-100 text-orange-700",
  platinum: "bg-purple-100 text-purple-700",
};

function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return null;
  const cls = TIER_COLORS[tier.toLowerCase()] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium capitalize ${cls}`}>
      {tier}
    </span>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const active = status.toLowerCase() === "active";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-sm font-medium ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`}
      />
      {status}
    </span>
  );
}

export default function MemberDetailPage() {
  const { contactId } = useParams<{ contactId: string }>();
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/members/${contactId}`)
      .then((r) => {
        if (r.status === 401) throw new Error("unauthorized");
        return r.json();
      })
      .then(setMember)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [contactId]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-44px)] bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading member…</p>
      </div>
    );
  }

  if (error === "unauthorized") {
    return (
      <div className="min-h-[calc(100vh-44px)] bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Session expired. Please sign in again.</p>
          <Link
            href="/members/login"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="min-h-[calc(100vh-44px)] bg-slate-50 flex items-center justify-center">
        <p className="text-red-400 text-sm">Failed to load member.</p>
      </div>
    );
  }

  const fullName =
    [member.firstname, member.lastname].filter(Boolean).join(" ") || "Unknown";

  return (
    <div className="min-h-[calc(100vh-44px)] bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Back */}
        <Link
          href="/members"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-6"
        >
          ← Back to search
        </Link>

        {/* Profile header */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{fullName}</h1>
              <p className="text-sm text-slate-500 mt-1">{member.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={member.vtg_current_membership_status} />
              <TierBadge tier={member.vtg_current_membership_tier} />
            </div>
          </div>

          {member.vtg_billing_source && (() => {
            const src = member.vtg_billing_source.toLowerCase();
            const subId =
              src === "recharge"
                ? member.vtg_recharge_subscription_id
                : (src === "stripe" || src === "ace")
                  ? member.vtg_stripe_subscription_id
                  : null;
            const subUrl =
              src === "recharge" && subId
                ? `https://acquisition-com-sp.admin.rechargeapps.com/merchant/subscriptions/${subId}/details`
                : (src === "stripe" || src === "ace") && subId
                  ? `https://dashboard.stripe.com/acct_1LVfphGF4X4zxB3F/subscriptions/${subId}`
                  : null;
            return (
              <p className="text-xs text-slate-400 mt-4">
                Billing via{" "}
                {subUrl ? (
                  <a
                    href={subUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium capitalize text-blue-500 hover:underline"
                  >
                    {member.vtg_billing_source}
                  </a>
                ) : (
                  <span className="font-medium text-slate-600 capitalize">
                    {member.vtg_billing_source}
                  </span>
                )}
              </p>
            );
          })()}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Membership Records */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Membership Records
            </h2>
            {member.membershipRecords.length === 0 ? (
              <p className="text-sm text-slate-400">No records found.</p>
            ) : (
              <div className="space-y-3">
                {member.membershipRecords.map((r) => {
                  const rechargeSub = r.properties.recharge_subscription_id;
                  const stripeSub = r.properties.stripe_subscription_id;
                  return (
                    <div
                      key={r.id}
                      className="border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                    >
                      <a
                        href={`https://app.hubspot.com/contacts/21368823/record/2-57143627/${r.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-500 hover:underline"
                      >
                        {r.properties.membership_name || "—"}
                      </a>
                      <p className="text-xs text-slate-500 capitalize">
                        {(r.properties.membership_status || "").replace(/_/g, " ")}
                      </p>
                      {r.properties.start_date && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {r.properties.start_date}
                          {r.properties.end_date
                            ? ` → ${r.properties.end_date}`
                            : ""}
                        </p>
                      )}
                      <div className="flex gap-3 mt-1">
                        {rechargeSub && (
                          <a
                            href={`https://app.rechargeapps.com/merchant/subscriptions/${rechargeSub}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline"
                          >
                            Recharge ↗
                          </a>
                        )}
                        {stripeSub && (
                          <a
                            href={`https://dashboard.stripe.com/subscriptions/${stripeSub}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline"
                          >
                            Stripe ↗
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Deals */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Deals
            </h2>
            {member.deals.length === 0 ? (
              <p className="text-sm text-slate-400">No deals found.</p>
            ) : (
              <div className="space-y-3">
                {member.deals.map((d) => (
                  <div
                    key={d.id}
                    className="border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                  >
                    <a
                      href={`https://app.hubspot.com/contacts/21368823/record/0-3/${d.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-500 hover:underline"
                    >
                      {d.properties.dealname || "Untitled deal"}
                    </a>
                    <p className="text-xs text-slate-500 capitalize">
                      {(d.properties.dealstage || "").replace(/_/g, " ")}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {d.properties.amount && (
                        <span className="text-xs text-emerald-600 font-medium">
                          ${parseFloat(d.properties.amount).toLocaleString()}
                        </span>
                      )}
                      {d.properties.closedate && (
                        <span className="text-xs text-slate-400">
                          {new Date(d.properties.closedate).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric", year: "numeric" }
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Timeline
          </h2>
          <MemberTimeline
            membershipRecords={member.membershipRecords}
            deals={member.deals}
          />
        </div>
      </div>
    </div>
  );
}
