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
  ai_summary: string | null;
  summary_generated_at: string | null;
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

interface SkoolComment {
  comment_id: string;
  content: string;
  upvotes: number;
  created_at: string;
  post_id: string;
  parent_post_title: string;
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
  skoolComments: SkoolComment[];
  revenueSnapshot: {
    total: number;
    cancelled: number;
    refunded: number;
  };
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

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function SkoolProfileCard({
  profile,
  posts,
  comments,
  contactId,
  onRegenerate,
}: {
  profile: SkoolProfile;
  posts: SkoolPost[];
  comments: SkoolComment[];
  contactId: string;
  onRegenerate: () => void;
}) {
  const [bioExpanded, setBioExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [activityFilter, setActivityFilter] = useState<"all" | "post" | "comment">("all");
  const [regenerating, setRegenerating] = useState(false);
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
      </div>

      {(profile.join_date || profile.bio) && (
        <div className="grid grid-cols-[auto_1fr] gap-x-8 mt-4 text-sm">
          {profile.join_date && (
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">Joined</p>
              <p className="font-medium text-slate-800">{formatDate(profile.join_date)}</p>
            </div>
          )}
          {profile.bio ? (
            <div>
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">Profile Bio</p>
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
          ) : profile.join_date ? (
            <div />
          ) : null}
        </div>
      )}

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

      {/* AI Summary */}
      {(posts.length > 0 || comments.length > 0) && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              ✨ AI Summary
            </h3>
            {profile.summary_generated_at && (
              <>
                <span className="text-[10px] text-slate-300">
                  Generated {formatRelativeTime(profile.summary_generated_at)}
                </span>
                <button
                  onClick={async () => {
                    setRegenerating(true);
                    try {
                      await fetch(`/api/members/${contactId}/regenerate-summary`, { method: "POST" });
                      onRegenerate();
                    } catch {
                      setRegenerating(false);
                    }
                  }}
                  className="text-slate-300 hover:text-slate-500 transition-colors"
                  title="Regenerate summary"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M11.5 7a4.5 4.5 0 1 1-1.3-3.2M11.5 2v1.8h-1.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </>
            )}
          </div>
          {profile.ai_summary && !regenerating ? (
            <p className="text-sm text-slate-600 leading-relaxed">{profile.ai_summary}</p>
          ) : (
            <div className="animate-pulse">
              <div className="h-3 w-full bg-slate-100 rounded mb-2" />
              <div className="h-3 w-3/4 bg-slate-100 rounded mb-2" />
              <div className="h-3 w-1/2 bg-slate-100 rounded" />
              <p className="text-xs text-slate-400 mt-2">Generating summary...</p>
            </div>
          )}
        </div>
      )}

      {(() => {
        type ActivityItem =
          | (SkoolPost & { type: "post" })
          | (SkoolComment & { type: "comment" });

        const allItems: ActivityItem[] = [
          ...posts.map((p) => ({ ...p, type: "post" as const })),
          ...comments.map((c) => ({ ...c, type: "comment" as const })),
        ].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        if (allItems.length === 0) return null;

        const filtered = activityFilter === "all"
          ? allItems
          : allItems.filter((item) => item.type === activityFilter);
        const items = filtered.slice(0, visibleCount);
        const hasMore = visibleCount < filtered.length;

        const totalPosts = posts.length;
        const totalComments = comments.length;

        const labelCls = (active: boolean) =>
          `text-[11px] font-semibold uppercase tracking-wider cursor-pointer transition-colors ${
            active ? "text-slate-700" : "text-slate-400 hover:text-slate-600"
          }`;
        const badgeCls = (active: boolean) =>
          `text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
            active ? "bg-slate-200 text-slate-700" : "bg-slate-100 text-slate-500"
          }`;

        return (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => { setActivityFilter("all"); setVisibleCount(5); }}
                className={labelCls(activityFilter === "all")}
              >
                Recent Activity
              </button>
              <span className={badgeCls(activityFilter === "all")}>
                {totalPosts + totalComments}
              </span>
              <button
                onClick={() => { setActivityFilter("post"); setVisibleCount(5); }}
                className={labelCls(activityFilter === "post")}
              >
                Posts
              </button>
              <span className={badgeCls(activityFilter === "post")}>
                {totalPosts}
              </span>
              <button
                onClick={() => { setActivityFilter("comment"); setVisibleCount(5); }}
                className={labelCls(activityFilter === "comment")}
              >
                Comments
              </button>
              <span className={badgeCls(activityFilter === "comment")}>
                {totalComments}
              </span>
            </div>
            <div className="space-y-3">
              {items.map((item) =>
                item.type === "post" ? (
                  <div
                    key={`post-${item.post_id}`}
                    className="border-l-2 border-indigo-300 bg-indigo-50/30 pl-3 pb-3 pr-3 pt-2 rounded-r-lg border-b border-b-slate-100 last:border-b-0"
                  >
                    <span className="text-[10px] uppercase tracking-wide font-semibold text-indigo-400">
                      Post
                    </span>
                    <a
                      href={`https://www.skool.com/acq/${slugify(item.title || "untitled")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors mt-0.5"
                    >
                      {item.title || "Untitled"}
                    </a>
                    {item.content && (
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {stripMarkdown(item.content).slice(0, 120)}
                        {item.content.length > 120 ? "..." : ""}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                      {item.category && <span>{item.category}</span>}
                      {item.created_at && <span>{formatDate(item.created_at)}</span>}
                      {item.upvotes > 0 && (
                        <span>
                          {item.upvotes} upvote{item.upvotes !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    key={`comment-${item.comment_id}`}
                    className="border-l-2 border-amber-300 bg-amber-50/30 pl-3 pb-3 pr-3 pt-2 rounded-r-lg border-b border-b-slate-100 last:border-b-0"
                  >
                    <span className="text-[10px] uppercase tracking-wide font-semibold text-amber-500">
                      Comment
                    </span>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Commented on:{" "}
                      <a
                        href={`https://www.skool.com/acq/${slugify(item.parent_post_title || "untitled")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline transition-colors font-medium"
                      >
                        {item.parent_post_title || "Untitled"}
                      </a>
                    </p>
                    {item.content && (
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {stripMarkdown(item.content).slice(0, 120)}
                        {item.content.length > 120 ? "..." : ""}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                      {item.created_at && <span>{formatDate(item.created_at)}</span>}
                      {item.upvotes > 0 && (
                        <span>
                          {item.upvotes} upvote{item.upvotes !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
            {hasMore && (
              <div className="relative pt-2 flex justify-center">
                <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-t from-white via-white/80 to-transparent -translate-y-full pointer-events-none" />
                <button
                  onClick={() => setVisibleCount((c) => c + 5)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M5 8l5 5 5-5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        );
      })()}
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
      <div className="max-w-6xl mx-auto px-6 py-8">
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
      <div className="max-w-6xl mx-auto px-6 py-8">
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
            <div className="text-right">
              {member.revenueSnapshot && (
                <div className="flex items-center gap-1.5 text-sm justify-end">
                  <span className="text-emerald-700 font-semibold">
                    ${member.revenueSnapshot.total.toLocaleString()}
                  </span>
                  <span className="text-slate-400">earned</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-amber-600 font-semibold">
                    ${member.revenueSnapshot.cancelled.toLocaleString()}
                  </span>
                  <span className="text-slate-400">cancelled</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-red-600 font-semibold">
                    ${member.revenueSnapshot.refunded.toLocaleString()}
                  </span>
                  <span className="text-slate-400">refunded</span>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1.5 justify-end">
                <StatusBadge status={member.vtg_current_membership_status} />
                <TierBadge tier={member.vtg_current_membership_tier} />
              </div>
            </div>
          </div>

          <BillingButton member={member} />
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 mb-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Timeline
          </h2>
          <MemberTimeline
            membershipRecords={member.membershipRecords}
            deals={member.deals}
          />
        </div>

        {/* Skool Community Profile */}
        {member.skoolProfile && (
          <SkoolProfileCard
            profile={member.skoolProfile}
            posts={member.skoolPosts ?? []}
            comments={member.skoolComments ?? []}
            contactId={contactId}
            onRegenerate={() => {
              fetch(`/api/members/${contactId}`)
                .then((r) => r.json())
                .then(setMember);
            }}
          />
        )}
      </div>
    </div>
  );
}
