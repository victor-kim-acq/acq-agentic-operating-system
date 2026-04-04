"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import MemberTimeline from "@/components/MemberTimeline";
import MemberSearch from "@/components/MemberSearch";

interface MembershipRecord {
  id: string;
  properties: Record<string, string | null>;
  associatedDealId?: string;
}

interface Deal {
  id: string;
  properties: Record<string, string | null>;
}

interface SkoolProfile {
  user_id: string;
  email: string;
  full_name: string;
  tier: string | null;
  bio: string | null;
  points: number;
  level: number;
  ltv: number;
  join_date: string | null;
  onboarding_answers: Record<string, unknown> | null;
}

interface SkoolPost {
  post_id: string;
  title: string;
  content: string;
  category: string;
  upvotes: number;
  comments_count: number;
  created_at: string;
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
  skoolProfile: SkoolProfile | null;
  skoolPosts: SkoolPost[];
}

const TIER_COLORS: Record<string, string> = {
  gold: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  silver: "bg-slate-50 text-slate-700 ring-1 ring-slate-200",
  bronze: "bg-orange-50 text-orange-800 ring-1 ring-orange-200",
  platinum: "bg-violet-50 text-violet-800 ring-1 ring-violet-200",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return null;
  const cls =
    TIER_COLORS[tier.toLowerCase()] ??
    "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${cls}`}
    >
      {tier}
    </span>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const active = status.toLowerCase() === "active";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${
        active
          ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
          : "bg-slate-50 text-slate-600 ring-1 ring-slate-200"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          active ? "bg-emerald-500" : "bg-slate-400"
        }`}
      />
      {status}
    </span>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className="flex-shrink-0"
    >
      <path
        d="M3.5 2H10V8.5M10 2L2 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BillingButton({ member }: { member: MemberProfile }) {
  if (!member.vtg_billing_source) return null;

  const src = member.vtg_billing_source.toLowerCase();
  const displayName = src === "recharge" ? "Recharge" : "Stripe";
  const subId =
    src === "recharge"
      ? member.vtg_recharge_subscription_id
      : src === "stripe" || src === "ace"
        ? member.vtg_stripe_subscription_id
        : null;
  const subUrl =
    src === "recharge" && subId
      ? `https://acquisition-com-sp.admin.rechargeapps.com/merchant/subscriptions/${subId}/details`
      : (src === "stripe" || src === "ace") && subId
        ? `https://dashboard.stripe.com/acct_1LVfphGF4X4zxB3F/subscriptions/${subId}`
        : null;

  if (subUrl) {
    return (
      <a
        href={subUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border text-blue-700 border-blue-200 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-300 transition-colors mt-4"
      >
        View Current Subscription in {displayName}
        <ExternalLinkIcon />
      </a>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-400 bg-slate-50/50 mt-4 cursor-default">
      View Current Subscription in {displayName}
      <ExternalLinkIcon />
    </span>
  );
}

function stripMarkdown(text: string): string {
  return text
    .replace(/[#*_~`>\[\]()!|-]/g, "")
    .replace(/\n{2,}/g, " ")
    .replace(/\n/g, " ")
    .trim();
}

function SkoolProfileCard({ profile }: { profile: SkoolProfile }) {
  const [bioExpanded, setBioExpanded] = useState(false);
  const ltvDollars = (profile.ltv / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  });

  const answers = profile.onboarding_answers as Record<string, string> | null;
  const hasAnswers = answers && Object.keys(answers).length > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 mt-6">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
        Community Profile
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        {profile.tier && (
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide">Tier</p>
            <p className="font-medium text-slate-800 capitalize">{profile.tier}</p>
          </div>
        )}
        <div>
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Level</p>
          <p className="font-medium text-slate-800">{profile.level}</p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Points</p>
          <p className="font-medium text-slate-800">{profile.points.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">LTV</p>
          <p className="font-medium text-emerald-700">{ltvDollars}</p>
        </div>
        {profile.join_date && (
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide">Joined</p>
            <p className="font-medium text-slate-800">{formatDate(profile.join_date)}</p>
          </div>
        )}
      </div>

      {hasAnswers && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
            {answers.revenue_bracket && (
              <p className="text-slate-600">
                <span className="text-slate-400">Revenue:</span>{" "}
                {String(answers.revenue_bracket)}
              </p>
            )}
            {answers.website && (
              <p className="text-slate-600">
                <span className="text-slate-400">Website:</span>{" "}
                {String(answers.website)}
              </p>
            )}
          </div>
        </div>
      )}

      {profile.bio && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-sm text-slate-600 leading-relaxed">
            {bioExpanded || profile.bio.length <= 200
              ? profile.bio
              : `${profile.bio.slice(0, 200)}...`}
          </p>
          {profile.bio.length > 200 && (
            <button
              onClick={() => setBioExpanded(!bioExpanded)}
              className="text-xs text-blue-600 hover:text-blue-800 mt-1"
            >
              {bioExpanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SkoolPostsSection({ posts }: { posts: SkoolPost[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? posts : posts.slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 mt-6">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Community Posts
        </h2>
        <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
          {posts.length}
        </span>
      </div>
      <div className="space-y-3">
        {visible.map((post) => (
          <div
            key={post.post_id}
            className="border-l-2 border-indigo-200 pl-3 pb-3 border-b border-b-slate-100 last:border-b-0 last:pb-0"
          >
            <p className="text-sm font-medium text-slate-800">
              {post.title || "Untitled"}
            </p>
            {post.content && (
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {stripMarkdown(post.content).slice(0, 150)}
                {post.content.length > 150 ? "..." : ""}
              </p>
            )}
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
              {post.upvotes > 0 && <span>{post.upvotes} upvote{post.upvotes !== 1 ? "s" : ""}</span>}
              {post.comments_count > 0 && <span>{post.comments_count} comment{post.comments_count !== 1 ? "s" : ""}</span>}
              {post.created_at && <span>{formatDate(post.created_at)}</span>}
            </div>
          </div>
        ))}
      </div>
      {posts.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-blue-600 hover:text-blue-800 mt-3"
        >
          {showAll ? "Show less" : `Show all ${posts.length} posts`}
        </button>
      )}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="min-h-[calc(100vh-44px)] bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="h-4 w-24 bg-slate-200 rounded mb-6 animate-pulse" />

        {/* Profile header skeleton */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="h-7 w-48 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-36 bg-slate-100 rounded animate-pulse mt-2" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-16 bg-slate-100 rounded animate-pulse" />
              <div className="h-5 w-14 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-8 w-64 bg-slate-100 rounded-lg animate-pulse mt-4" />
        </div>

        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200/80 p-5"
            >
              <div className="h-3 w-32 bg-slate-200 rounded animate-pulse mb-4" />
              <div className="space-y-3">
                {[0, 1, 2].map((j) => (
                  <div key={j} className="border-b border-slate-100 pb-3 last:border-0">
                    <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
                    <div className="h-3 w-24 bg-slate-50 rounded animate-pulse mt-1.5" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Timeline skeleton */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 mt-6">
          <div className="h-3 w-20 bg-slate-200 rounded animate-pulse mb-4" />
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="w-6 h-6 bg-slate-100 rounded-full animate-pulse flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-4 w-44 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-28 bg-slate-50 rounded animate-pulse mt-1.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
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

  if (loading) return <ProfileSkeleton />;

  if (error === "unauthorized") {
    return (
      <div className="min-h-[calc(100vh-44px)] bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">
            Session expired. Please sign in again.
          </p>
          <Link
            href="/members/login"
            className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
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
        <p className="text-red-500 text-sm">Failed to load member.</p>
      </div>
    );
  }

  const fullName =
    [member.firstname, member.lastname].filter(Boolean).join(" ") || "Unknown";

  return (
    <div className="min-h-[calc(100vh-44px)] bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <MemberSearch mode="compact" />

        {/* Back */}
        <Link
          href="/members"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors mb-6"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className="flex-shrink-0"
          >
            <path
              d="M8.5 3.5L5 7l3.5 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to search
        </Link>

        {/* Profile header */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                {fullName}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">{member.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={member.vtg_current_membership_status} />
              <TierBadge tier={member.vtg_current_membership_tier} />
            </div>
          </div>

          <BillingButton member={member} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Membership Records */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Membership Records
            </h2>
            {member.membershipRecords.length === 0 ? (
              <p className="text-sm text-slate-400">No records found.</p>
            ) : (
              <div className="space-y-3">
                {member.membershipRecords.map((r) => {
                  const subId = r.properties.vtg_subscription_id;
                  return (
                    <div
                      key={r.id}
                      className="border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                    >
                      <a
                        href={`https://app.hubspot.com/contacts/21368823/record/2-57143627/${r.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors capitalize"
                      >
                        {(r.properties.vtg_status || "—").replace(/_/g, " ")}
                      </a>
                      {(() => {
                        const parts = [
                          r.properties.vtg_membership_tier,
                          r.properties.vtg_billing_source,
                          r.properties.vtg_mrr
                            ? `$${parseFloat(r.properties.vtg_mrr).toLocaleString()}`
                            : null,
                        ].filter((v): v is string => v != null && v !== "");
                        return parts.length > 0 ? (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {parts.join(" \u00b7 ")}
                          </p>
                        ) : null;
                      })()}
                      {r.properties.vtg_billing_date && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatDate(r.properties.vtg_billing_date)}
                        </p>
                      )}
                      {subId && (
                        <div className="flex gap-3 mt-1.5">
                          <a
                            href={
                              r.properties.vtg_billing_source?.toLowerCase() === "recharge"
                                ? `https://app.rechargeapps.com/merchant/subscriptions/${subId}`
                                : `https://dashboard.stripe.com/subscriptions/${subId}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:text-blue-700 hover:underline transition-colors"
                          >
                            {r.properties.vtg_billing_source?.toLowerCase() === "recharge"
                              ? "Recharge"
                              : "Stripe"}{" "}
                            ↗
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Deals */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
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
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    >
                      {d.properties.dealname || "Untitled deal"}
                    </a>
                    <p className="text-xs text-slate-500 capitalize mt-0.5">
                      {(d.properties.dealstage || "").replace(/_/g, " ")}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {d.properties.amount && (
                        <span className="text-xs text-emerald-700 font-semibold">
                          ${parseFloat(d.properties.amount).toLocaleString()}
                        </span>
                      )}
                      {d.properties.closedate && (
                        <span className="text-xs text-slate-400">
                          {formatDate(d.properties.closedate)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Skool Community Profile */}
        {member.skoolProfile && (
          <SkoolProfileCard profile={member.skoolProfile} />
        )}

        {/* Skool Community Posts */}
        {member.skoolPosts && member.skoolPosts.length > 0 && (
          <SkoolPostsSection posts={member.skoolPosts} />
        )}

        {/* Timeline */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 mt-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
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
