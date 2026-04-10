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
  semantic_topic?: string;
  semantic_role?: string;
}

interface SkoolComment {
  comment_id: string;
  content: string;
  upvotes: number;
  created_at: string;
  post_id: string;
  parent_post_title: string;
  semantic_topic?: string;
  semantic_role?: string;
}

interface TopicAggRow {
  semantic_topic: string;
  semantic_role: string;
  count: number;
}

interface RoleDistRow {
  semantic_role: string;
  count: number;
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
  topicAggregation: TopicAggRow[];
  roleDistribution: RoleDistRow[];
  revenueSnapshot: {
    total: number;
    cancelled: number;
    refunded: number;
  };
}

const TOPIC_COLORS: Record<string, { label: string; bg: string; text: string }> = {
  conversational: { label: "Conversational", bg: "var(--neutral-100)", text: "var(--neutral-700)" },
  ai_tools: { label: "AI Tools", bg: "#ede9fe", text: "#6d28d9" },
  paid_ads: { label: "Paid Ads", bg: "#dbeafe", text: "#1d4ed8" },
  content_organic: { label: "Organic Content", bg: "#ccfbf1", text: "#0f766e" },
  lead_gen_funnels: { label: "Lead Gen Funnels", bg: "#d1fae5", text: "#047857" },
  email_outreach: { label: "Email Outreach", bg: "#fef3c7", text: "#b45309" },
  sales_offers: { label: "Sales Offers", bg: "#ffedd5", text: "#c2410c" },
  tracking_analytics: { label: "Tracking Analytics", bg: "#cffafe", text: "#0e7490" },
  scaling_strategy: { label: "Scaling Strategy", bg: "#e0e7ff", text: "#4338ca" },
  hiring: { label: "Hiring", bg: "#ffe4e6", text: "#be123c" },
  operations: { label: "Operations", bg: "#f5f5f4", text: "#57534e" },
};

const ROLE_META: Record<string, { label: string; icon: string }> = {
  giver: { label: "Giver", icon: "giving value" },
  seeker: { label: "Seeker", icon: "asking questions" },
  neutral: { label: "Neutral", icon: "social interaction" },
};

const ROLE_STYLES: Record<string, React.CSSProperties> = {
  giver: { background: "var(--color-success-light)", color: "var(--color-success)", boxShadow: "inset 0 0 0 1px var(--color-success)" },
  seeker: { background: "var(--color-warning-light)", color: "var(--color-warning)", boxShadow: "inset 0 0 0 1px var(--color-warning)" },
  neutral: { background: "var(--neutral-50)", color: "var(--neutral-500)", boxShadow: "inset 0 0 0 1px var(--neutral-200)" },
};

const TIER_STYLES: Record<string, React.CSSProperties> = {
  gold: { background: "#fffbeb", color: "#92400e", boxShadow: "inset 0 0 0 1px #fde68a" },
  silver: { background: "var(--neutral-50)", color: "var(--neutral-700)", boxShadow: "inset 0 0 0 1px var(--neutral-200)" },
  bronze: { background: "#fff7ed", color: "#9a3412", boxShadow: "inset 0 0 0 1px #fed7aa" },
  platinum: { background: "#f5f3ff", color: "#5b21b6", boxShadow: "inset 0 0 0 1px #ddd6fe" },
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
  const style = TIER_STYLES[tier.toLowerCase()] ?? TIER_STYLES.silver;
  return (
    <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide" style={style}>
      {tier}
    </span>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const active = status.toLowerCase() === "active";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide"
      style={active
        ? { background: "var(--color-success-light)", color: "var(--color-success)", boxShadow: "inset 0 0 0 1px var(--color-success)" }
        : { background: "var(--neutral-50)", color: "var(--neutral-600)", boxShadow: "inset 0 0 0 1px var(--neutral-200)" }
      }
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? "var(--color-success)" : "var(--neutral-400)" }} />
      {status}
    </span>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
      <path d="M3.5 2H10V8.5M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors mt-4"
        style={{ color: "var(--brand-primary)", borderColor: "var(--brand-primary)", background: "var(--brand-light)" }}
      >
        View Current Subscription in {displayName}
        <ExternalLinkIcon />
      </a>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border mt-4 cursor-default"
      style={{ borderColor: "var(--neutral-200)", color: "var(--neutral-400)", background: "var(--neutral-50)" }}
    >
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
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function TopicBadge({ topic }: { topic?: string }) {
  if (!topic) return null;
  const meta = TOPIC_COLORS[topic];
  if (!meta) return null;
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: meta.bg, color: meta.text }}>
      {meta.label}
    </span>
  );
}

function RoleBadge({ role }: { role?: string }) {
  if (!role) return null;
  const meta = ROLE_META[role];
  if (!meta) return null;
  const style = ROLE_STYLES[role] ?? ROLE_STYLES.neutral;
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium" style={style}>
      {meta.label}
    </span>
  );
}

function TopicExpertise({ topicAggregation, selectedTopic, onSelectTopic }: {
  topicAggregation: TopicAggRow[];
  selectedTopic: string | null;
  onSelectTopic: (topic: string | null) => void;
}) {
  if (topicAggregation.length === 0) return null;

  const topicTotals = new Map<string, number>();
  for (const row of topicAggregation) {
    topicTotals.set(row.semantic_topic, (topicTotals.get(row.semantic_topic) || 0) + row.count);
  }
  const sortedTopics = [...topicTotals.entries()].sort((a, b) => b[1] - a[1]);
  const totalActivity = sortedTopics.reduce((s, [, c]) => s + c, 0);

  return (
    <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--neutral-100)" }}>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--neutral-400)" }}>
        Topic Expertise
      </h3>
      <div className="flex flex-wrap gap-2">
        {sortedTopics.map(([topic, count]) => {
          const meta = TOPIC_COLORS[topic];
          if (!meta) return null;
          const pct = Math.round((count / totalActivity) * 100);
          const isActive = selectedTopic === topic;
          return (
            <button
              key={topic}
              onClick={() => onSelectTopic(isActive ? null : topic)}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-all"
              style={{
                background: isActive ? meta.text : meta.bg,
                color: isActive ? "white" : meta.text,
                boxShadow: isActive ? "0 0 0 2px " + meta.text : "none",
              }}
            >
              {meta.label} {count} ({pct}%)
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SkoolProfileCard({
  profile, posts, comments, contactId, onRegenerate, topicAggregation, roleDistribution,
}: {
  profile: SkoolProfile;
  posts: SkoolPost[];
  comments: SkoolComment[];
  contactId: string;
  onRegenerate: () => void;
  topicAggregation: TopicAggRow[];
  roleDistribution: RoleDistRow[];
}) {
  const [bioExpanded, setBioExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [activityFilter, setActivityFilter] = useState<"all" | "post" | "comment">("all");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const answers = profile.onboarding_answers as Record<string, string> | null;
  const hasAnswers = answers && Object.keys(answers).length > 0;

  return (
    <div className="rounded-xl border p-5 mt-6" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--shadow-sm)" }}>
      <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--neutral-400)" }}>
        Community Profile
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        {profile.tier && (
          <div>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--neutral-400)" }}>Tier</p>
            <p className="font-medium capitalize" style={{ color: "var(--neutral-800)" }}>{profile.tier}</p>
          </div>
        )}
        <div>
          <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--neutral-400)" }}>Level</p>
          <p className="font-medium" style={{ color: "var(--neutral-800)" }}>{profile.level}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--neutral-400)" }}>Points</p>
          <p className="font-medium" style={{ color: "var(--neutral-800)" }}>{profile.points.toLocaleString()}</p>
        </div>
        {profile.join_date && (
          <div>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--neutral-400)" }}>Joined</p>
            <p className="font-medium" style={{ color: "var(--neutral-800)" }}>{formatDate(profile.join_date)}</p>
          </div>
        )}
      </div>

      {profile.bio && (
        <div className="mt-4 text-sm">
          <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--neutral-400)" }}>Profile Bio</p>
          <p className="text-sm leading-relaxed mt-0.5" style={{ color: "var(--neutral-600)" }}>
            {bioExpanded || profile.bio.length <= 200
              ? profile.bio
              : `${profile.bio.slice(0, 200)}...`}
          </p>
          {profile.bio.length > 200 && (
            <button onClick={() => setBioExpanded(!bioExpanded)} className="text-xs mt-1" style={{ color: "var(--brand-primary)" }}>
              {bioExpanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}

      {hasAnswers && (
        <div className="mt-4 pt-3 border-t" style={{ borderColor: "var(--neutral-100)" }}>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
            {answers.revenue_bracket && (
              <p style={{ color: "var(--neutral-600)" }}>
                <span style={{ color: "var(--neutral-400)" }}>Revenue:</span> {String(answers.revenue_bracket)}
              </p>
            )}
            {answers.website && (
              <p style={{ color: "var(--neutral-600)" }}>
                <span style={{ color: "var(--neutral-400)" }}>Website:</span> {String(answers.website)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* AI Summary */}
      {(posts.length > 0 || comments.length > 0) && (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--neutral-100)" }}>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--neutral-400)" }}>
              \u2728 AI Summary
            </h3>
            {profile.summary_generated_at && (
              <>
                <span className="text-[10px]" style={{ color: "var(--neutral-300)" }}>
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
                  className="transition-colors"
                  style={{ color: "var(--neutral-300)" }}
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
            <p className="text-sm leading-relaxed" style={{ color: "var(--neutral-600)" }}>{profile.ai_summary}</p>
          ) : (
            <div className="animate-pulse">
              <div className="h-3 w-full rounded mb-2" style={{ background: "var(--neutral-100)" }} />
              <div className="h-3 w-3/4 rounded mb-2" style={{ background: "var(--neutral-100)" }} />
              <div className="h-3 w-1/2 rounded" style={{ background: "var(--neutral-100)" }} />
              <p className="text-xs mt-2" style={{ color: "var(--neutral-400)" }}>Generating summary...</p>
            </div>
          )}
        </div>
      )}

      <TopicExpertise topicAggregation={topicAggregation} selectedTopic={selectedTopic} onSelectTopic={(t) => { setSelectedTopic(t); setVisibleCount(5); }} />

      {(() => {
        type ActivityItem =
          | (SkoolPost & { type: "post" })
          | (SkoolComment & { type: "comment" });

        const allItems: ActivityItem[] = [
          ...posts.map((p) => ({ ...p, type: "post" as const })),
          ...comments.map((c) => ({ ...c, type: "comment" as const })),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        if (allItems.length === 0) return null;

        const topicFiltered = selectedTopic
          ? allItems.filter((item) => item.semantic_topic === selectedTopic)
          : allItems;
        const filtered = activityFilter === "all"
          ? topicFiltered
          : topicFiltered.filter((item) => item.type === activityFilter);
        const items = filtered.slice(0, visibleCount);
        const hasMore = visibleCount < filtered.length;

        const totalAll = topicFiltered.length;
        const totalPosts = topicFiltered.filter((i) => i.type === "post").length;
        const totalComments = topicFiltered.filter((i) => i.type === "comment").length;

        const labelStyle = (active: boolean): React.CSSProperties => ({
          color: active ? "var(--neutral-700)" : "var(--neutral-400)",
          cursor: "pointer",
        });
        const badgeStyle = (active: boolean): React.CSSProperties => ({
          background: active ? "var(--neutral-200)" : "var(--neutral-100)",
          color: active ? "var(--neutral-700)" : "var(--neutral-500)",
        });

        return (
          <div className="mt-4 pt-3 border-t" style={{ borderColor: "var(--neutral-100)" }}>
            <div className="flex items-center gap-3 mb-3">
              <button onClick={() => { setActivityFilter("all"); setVisibleCount(5); }} className="text-[11px] font-semibold uppercase tracking-wider transition-colors" style={labelStyle(activityFilter === "all")}>
                Recent Activity
              </button>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={badgeStyle(activityFilter === "all")}>{totalAll}</span>
              <button onClick={() => { setActivityFilter("post"); setVisibleCount(5); }} className="text-[11px] font-semibold uppercase tracking-wider transition-colors" style={labelStyle(activityFilter === "post")}>
                Posts
              </button>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={badgeStyle(activityFilter === "post")}>{totalPosts}</span>
              <button onClick={() => { setActivityFilter("comment"); setVisibleCount(5); }} className="text-[11px] font-semibold uppercase tracking-wider transition-colors" style={labelStyle(activityFilter === "comment")}>
                Comments
              </button>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={badgeStyle(activityFilter === "comment")}>{totalComments}</span>
            </div>
            <div className="space-y-3">
              {filtered.length === 0 && (
                <p className="text-sm py-3" style={{ color: "var(--neutral-400)" }}>No matching activity.</p>
              )}
              {items.map((item) =>
                item.type === "post" ? (
                  <div key={`post-${item.post_id}`} className="border-l-2 pl-3 pb-3 pr-3 pt-2 rounded-r-lg" style={{ borderLeftColor: "var(--chart-5)", background: "rgba(139, 92, 246, 0.04)" }}>
                    <span className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: "var(--chart-5)" }}>Post</span>
                    <a href={`https://www.skool.com/acq/${slugify(item.title || "untitled")}`} target="_blank" rel="noopener noreferrer" className="block text-sm font-medium transition-colors mt-0.5" style={{ color: "var(--brand-primary)" }}>
                      {item.title || "Untitled"}
                    </a>
                    {item.content && (
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--neutral-500)" }}>
                        {stripMarkdown(item.content).slice(0, 120)}{item.content.length > 120 ? "..." : ""}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] flex-wrap" style={{ color: "var(--neutral-400)" }}>
                      <RoleBadge role={item.semantic_role} />
                      <TopicBadge topic={item.semantic_topic} />
                      {item.category && <span>{item.category}</span>}
                      {item.created_at && <span>{formatDate(item.created_at)}</span>}
                      {item.upvotes > 0 && <span>{item.upvotes} upvote{item.upvotes !== 1 ? "s" : ""}</span>}
                    </div>
                  </div>
                ) : (
                  <div key={`comment-${item.comment_id}`} className="border-l-2 pl-3 pb-3 pr-3 pt-2 rounded-r-lg" style={{ borderLeftColor: "var(--chart-3)", background: "rgba(245, 158, 11, 0.04)" }}>
                    <span className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: "var(--chart-3)" }}>Comment</span>
                    <p className="text-xs mt-0.5" style={{ color: "var(--neutral-400)" }}>
                      Commented on:{" "}
                      <a href={`https://www.skool.com/acq/${slugify(item.parent_post_title || "untitled")}`} target="_blank" rel="noopener noreferrer" className="font-medium transition-colors" style={{ color: "var(--brand-primary)" }}>
                        {item.parent_post_title || "Untitled"}
                      </a>
                    </p>
                    {item.content && (
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--neutral-500)" }}>
                        {stripMarkdown(item.content).slice(0, 120)}{item.content.length > 120 ? "..." : ""}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] flex-wrap" style={{ color: "var(--neutral-400)" }}>
                      <RoleBadge role={item.semantic_role} />
                      <TopicBadge topic={item.semantic_topic} />
                      {item.created_at && <span>{formatDate(item.created_at)}</span>}
                      {item.upvotes > 0 && <span>{item.upvotes} upvote{item.upvotes !== 1 ? "s" : ""}</span>}
                    </div>
                  </div>
                )
              )}
            </div>
            {hasMore && (
              <div className="relative pt-2 flex justify-center">
                <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-t from-white via-white/80 to-transparent -translate-y-full pointer-events-none" />
                <button onClick={() => setVisibleCount((c) => c + 5)} className="transition-colors cursor-pointer" style={{ color: "var(--neutral-400)" }}>
                  <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
                    <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
    <div className="rounded-xl border p-5 mt-6" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--neutral-400)" }}>
          Community Posts
        </h2>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "var(--neutral-100)", color: "var(--neutral-500)" }}>
          {posts.length}
        </span>
      </div>
      <div className="space-y-3">
        {visible.map((post) => (
          <div key={post.post_id} className="border-l-2 pl-3 pb-3 border-b last:border-b-0 last:pb-0" style={{ borderLeftColor: "var(--chart-5)", borderBottomColor: "var(--neutral-100)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--neutral-800)" }}>
              {post.title || "Untitled"}
            </p>
            {post.content && (
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--neutral-500)" }}>
                {stripMarkdown(post.content).slice(0, 150)}{post.content.length > 150 ? "..." : ""}
              </p>
            )}
            <div className="flex items-center gap-3 mt-1.5 text-[11px]" style={{ color: "var(--neutral-400)" }}>
              {post.upvotes > 0 && <span>{post.upvotes} upvote{post.upvotes !== 1 ? "s" : ""}</span>}
              {post.comments_count > 0 && <span>{post.comments_count} comment{post.comments_count !== 1 ? "s" : ""}</span>}
              {post.created_at && <span>{formatDate(post.created_at)}</span>}
            </div>
          </div>
        ))}
      </div>
      {posts.length > 5 && (
        <button onClick={() => setShowAll(!showAll)} className="text-xs mt-3" style={{ color: "var(--brand-primary)" }}>
          {showAll ? "Show less" : `Show all ${posts.length} posts`}
        </button>
      )}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="min-h-[calc(100vh-44px)]" style={{ background: "var(--page-bg)" }}>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="h-4 w-24 rounded mb-6 animate-pulse" style={{ background: "var(--neutral-200)" }} />
        <div className="rounded-xl border p-6 mb-6" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="h-7 w-48 rounded animate-pulse" style={{ background: "var(--neutral-200)" }} />
              <div className="h-4 w-36 rounded animate-pulse mt-2" style={{ background: "var(--neutral-100)" }} />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 w-16 rounded animate-pulse" style={{ background: "var(--neutral-100)" }} />
              <div className="h-5 w-14 rounded animate-pulse" style={{ background: "var(--neutral-100)" }} />
            </div>
          </div>
          <div className="h-8 w-64 rounded-lg animate-pulse mt-4" style={{ background: "var(--neutral-100)" }} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-xl border p-5" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
              <div className="h-3 w-32 rounded animate-pulse mb-4" style={{ background: "var(--neutral-200)" }} />
              <div className="space-y-3">
                {[0, 1, 2].map((j) => (
                  <div key={j} className="border-b pb-3 last:border-0" style={{ borderColor: "var(--neutral-100)" }}>
                    <div className="h-4 w-40 rounded animate-pulse" style={{ background: "var(--neutral-100)" }} />
                    <div className="h-3 w-24 rounded animate-pulse mt-1.5" style={{ background: "var(--neutral-50)" }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border p-5 mt-6" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <div className="h-3 w-20 rounded animate-pulse mb-4" style={{ background: "var(--neutral-200)" }} />
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="w-6 h-6 rounded-full animate-pulse flex-shrink-0" style={{ background: "var(--neutral-100)" }} />
                <div className="flex-1">
                  <div className="h-4 w-44 rounded animate-pulse" style={{ background: "var(--neutral-100)" }} />
                  <div className="h-3 w-28 rounded animate-pulse mt-1.5" style={{ background: "var(--neutral-50)" }} />
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
      <div className="min-h-[calc(100vh-44px)] flex items-center justify-center" style={{ background: "var(--page-bg)" }}>
        <div className="text-center">
          <p className="mb-4" style={{ color: "var(--neutral-600)" }}>Session expired. Please sign in again.</p>
          <Link href="/members/login" className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors" style={{ background: "var(--neutral-900)" }}>
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="min-h-[calc(100vh-44px)] flex items-center justify-center" style={{ background: "var(--page-bg)" }}>
        <p className="text-sm" style={{ color: "var(--color-danger)" }}>Failed to load member.</p>
      </div>
    );
  }

  const fullName = [member.firstname, member.lastname].filter(Boolean).join(" ") || "Unknown";

  return (
    <div className="min-h-[calc(100vh-44px)]" style={{ background: "var(--page-bg)" }}>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <MemberSearch mode="compact" />

        <Link href="/members" className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors mb-6" style={{ color: "var(--neutral-400)" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
            <path d="M8.5 3.5L5 7l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to search
        </Link>

        {/* Profile header */}
        <div className="rounded-xl border p-6 mb-6" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--neutral-900)" }}>{fullName}</h1>
              <p className="text-sm mt-0.5" style={{ color: "var(--neutral-500)" }}>{member.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={member.vtg_current_membership_status} />
              <TierBadge tier={member.vtg_current_membership_tier} />
            </div>
          </div>

          <BillingButton member={member} />

          {member.revenueSnapshot && (member.revenueSnapshot.total > 0 || member.revenueSnapshot.cancelled > 0 || member.revenueSnapshot.refunded > 0) && (
            <div className="grid grid-cols-3 gap-4 text-sm mt-4 pt-4 border-t" style={{ borderColor: "var(--neutral-100)" }}>
              <div>
                <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--neutral-400)" }}>Earned</p>
                <p className="font-medium" style={{ color: "var(--color-success)" }}>${member.revenueSnapshot.total.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--neutral-400)" }}>Cancelled</p>
                <p className="font-medium" style={{ color: "var(--color-warning)" }}>${member.revenueSnapshot.cancelled.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--neutral-400)" }}>Refunded</p>
                <p className="font-medium" style={{ color: "var(--color-danger)" }}>${member.revenueSnapshot.refunded.toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="rounded-xl border p-5 mb-6" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--shadow-sm)" }}>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--neutral-400)" }}>Timeline</h2>
          <MemberTimeline membershipRecords={member.membershipRecords} deals={member.deals} />
        </div>

        {/* Skool Community Profile */}
        {member.skoolProfile && (
          <SkoolProfileCard
            profile={member.skoolProfile}
            posts={member.skoolPosts ?? []}
            comments={member.skoolComments ?? []}
            contactId={contactId}
            topicAggregation={member.topicAggregation ?? []}
            roleDistribution={member.roleDistribution ?? []}
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
