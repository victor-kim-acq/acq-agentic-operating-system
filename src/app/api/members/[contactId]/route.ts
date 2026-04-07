import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@/lib/session";
import { sql } from "@/lib/db";

export const fetchCache = 'force-no-store';

const HS_BASE = "https://api.hubapi.com";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contactId } = await params;
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const contactProps = [
    "firstname",
    "lastname",
    "email",
    "vtg_current_membership_tier",
    "vtg_current_membership_status",
    "vtg_billing_source",
    "vtg_recharge_subscription_id",
    "vtg_stripe_subscription_id",
    "hs_additional_emails",
  ].join(",");

  const [contactRes, membershipAssocRes, dealAssocRes] = await Promise.all([
    fetch(
      `${HS_BASE}/crm/v3/objects/contacts/${contactId}?properties=${contactProps}`,
      { headers }
    ),
    fetch(`${HS_BASE}/crm/v4/associations/contacts/2-57143627/batch/read`, {
      method: "POST",
      headers,
      body: JSON.stringify({ inputs: [{ id: contactId }] }),
    }),
    fetch(`${HS_BASE}/crm/v4/associations/contacts/deals/batch/read`, {
      method: "POST",
      headers,
      body: JSON.stringify({ inputs: [{ id: contactId }] }),
    }),
  ]);

  const [contactData, membershipAssocData, dealAssocData] = await Promise.all([
    contactRes.json(),
    membershipAssocRes.json(),
    dealAssocRes.json(),
  ]);

  const props = contactData.properties ?? {};

  const membershipIds: string[] = (
    membershipAssocData.results?.[0]?.to ?? []
  ).map((t: { toObjectId: string }) => t.toObjectId);

  const dealIds: string[] = (dealAssocData.results?.[0]?.to ?? []).map(
    (t: { toObjectId: string }) => t.toObjectId
  );

  const membershipProps = [
    "hs_createdate",
    "vtg_membership_tier",
    "vtg_status",
    "vtg_billing_date",
    "vtg_billing_source",
    "membership_name",
    "vtg_mrr",
    "vtg_subscription_id",
  ];

  const dealProps = ["dealname", "dealstage", "amount", "closedate", "createdate", "pipeline"];

  const [membershipRecordsRaw, deals, membershipDealAssocData] = await Promise.all([
    membershipIds.length > 0
      ? fetch(`${HS_BASE}/crm/v3/objects/2-57143627/batch/read`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            inputs: membershipIds.map((id) => ({ id })),
            properties: membershipProps,
          }),
        })
          .then((r) => r.json())
          .then((d) => d.results ?? [])
      : Promise.resolve([]),
    dealIds.length > 0
      ? fetch(`${HS_BASE}/crm/v3/objects/deals/batch/read`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            inputs: dealIds.map((id) => ({ id })),
            properties: dealProps,
          }),
        })
          .then((r) => r.json())
          .then((d) => d.results ?? [])
      : Promise.resolve([]),
    membershipIds.length > 0
      ? fetch(`${HS_BASE}/crm/v4/associations/2-57143627/0-3/batch/read`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            inputs: membershipIds.map((id) => ({ id })),
          }),
        })
          .then((r) => r.json())
      : Promise.resolve({ results: [] }),
  ]);

  // Build membership → deal map
  const membershipDealMap: Record<string, string> = {};
  for (const entry of membershipDealAssocData.results ?? []) {
    const fromId = entry.from?.id;
    const toId = entry.to?.[0]?.toObjectId;
    if (fromId && toId) {
      membershipDealMap[fromId] = String(toId);
    }
  }

  // Attach associatedDealId to each membership record
  const membershipRecords = membershipRecordsRaw.map(
    (rec: { id: string; properties: Record<string, string | null> }) => ({
      ...rec,
      associatedDealId: membershipDealMap[rec.id] ?? null,
    })
  );

  // --- Revenue snapshot ---
  let totalRevenue = 0;
  let totalCancelled = 0;
  let totalRefunded = 0;

  for (const rec of membershipRecords) {
    const mrr = parseFloat(rec.properties?.vtg_mrr || "0") || 0;
    const status = (rec.properties?.vtg_status || "").toLowerCase();

    if (status === "refund" || status === "refunded") {
      totalRefunded += mrr;
    } else if (status === "cancellation" || status === "cancelled" || status === "canceled") {
      totalCancelled += mrr;
    } else {
      totalRevenue += mrr;
    }
  }

  // --- Skool community data ---
  const primaryEmail = (props.email ?? "").toLowerCase().trim();
  const additionalEmails = (props.hs_additional_emails ?? "")
    .split(";")
    .map((e: string) => e.toLowerCase().trim())
    .filter(Boolean);
  const allEmails = [...new Set([primaryEmail, ...additionalEmails])].filter(Boolean);

  let skoolProfile = null;
  let skoolPosts: Array<Record<string, unknown>> = [];
  let skoolComments: Array<Record<string, unknown>> = [];
  let topicAggregation: Array<Record<string, unknown>> = [];
  let roleDistribution: Array<Record<string, unknown>> = [];

  if (allEmails.length > 0) {
    try {
      const emailArrayLiteral = `{${allEmails.join(",")}}`;
      const memberResult = await sql`
        SELECT user_id, email, full_name, tier, bio, points, level, ltv, join_date, onboarding_answers, ai_summary, summary_generated_at
        FROM skool_members
        WHERE LOWER(email) = ANY(${emailArrayLiteral}::text[])
        LIMIT 1
      `;

      if (memberResult.rows.length > 0) {
        skoolProfile = memberResult.rows[0];

        const [postsResult, commentsResult, topicAggResult, roleDistResult] = await Promise.all([
          sql`
            SELECT post_id, title, content, category, upvotes, comments_count, created_at, semantic_topic, semantic_role
            FROM skool_posts
            WHERE author_id = ${skoolProfile.user_id}
            ORDER BY created_at DESC
          `,
          sql`
            SELECT c.comment_id, c.content, c.upvotes, c.created_at, c.post_id,
                   p.title AS parent_post_title, c.semantic_topic, c.semantic_role
            FROM skool_comments c
            JOIN skool_posts p ON p.post_id = c.post_id
            WHERE c.author_id = ${skoolProfile.user_id}
            ORDER BY c.created_at DESC
          `,
          sql`
            SELECT semantic_topic, semantic_role, COUNT(*)::int AS count
            FROM (
              SELECT semantic_topic, semantic_role FROM skool_posts
              WHERE author_id = ${skoolProfile.user_id} AND semantic_topic IS NOT NULL
              UNION ALL
              SELECT semantic_topic, semantic_role FROM skool_comments
              WHERE author_id = ${skoolProfile.user_id} AND semantic_topic IS NOT NULL
            ) combined
            GROUP BY semantic_topic, semantic_role
            ORDER BY count DESC
          `,
          sql`
            SELECT semantic_role, COUNT(*)::int AS count
            FROM (
              SELECT semantic_role FROM skool_posts WHERE author_id = ${skoolProfile.user_id} AND semantic_role IS NOT NULL
              UNION ALL
              SELECT semantic_role FROM skool_comments WHERE author_id = ${skoolProfile.user_id} AND semantic_role IS NOT NULL
            ) combined
            GROUP BY semantic_role
            ORDER BY count DESC
          `,
        ]);
        skoolPosts = postsResult.rows;
        skoolComments = commentsResult.rows;
        topicAggregation = topicAggResult.rows;
        roleDistribution = roleDistResult.rows;

        // --- AI Summary generation/caching ---
        if (skoolPosts.length > 0 || skoolComments.length > 0) {
          const summaryAge = skoolProfile.summary_generated_at
            ? Date.now() - new Date(skoolProfile.summary_generated_at).getTime()
            : Infinity;
          const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

          if (!skoolProfile.ai_summary || summaryAge > SEVEN_DAYS) {
            try {
              const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

              // Build topic breakdown from classification data
              const topicSummary = topicAggregation.length > 0
                ? topicAggregation.map((r: Record<string, unknown>) =>
                    `${r.semantic_topic} (${r.count} ${r.semantic_role === 'giver' ? 'giving' : r.semantic_role === 'seeker' ? 'seeking' : 'neutral'})`
                  ).join(", ")
                : "No substantive topics classified";

              const roleSummary = roleDistribution.map((r: Record<string, unknown>) =>
                `${r.semantic_role}: ${r.count}`
              ).join(", ");

              // Include a handful of recent post titles for color
              const recentTitles = skoolPosts.slice(0, 8).map((p: Record<string, unknown>) =>
                `- "${p.title}" [${p.semantic_topic || "unclassified"}]`
              ).join("\n");

              const summaryPrompt = `You are analyzing a community member's engagement in ACQ Vantage (a paid business community). Based on their classified activity data below, write a 2-3 sentence summary of: (1) their primary areas of expertise or interest, (2) whether they primarily give value or seek help, and (3) any notable patterns. Be specific and concise. No fluff.

Member: ${skoolProfile.full_name}
Tier: ${skoolProfile.tier || "Unknown"}
Level: ${skoolProfile.level}, Points: ${skoolProfile.points}
Total posts: ${skoolPosts.length}, Total comments: ${skoolComments.length}

Topic breakdown (excluding conversational): ${topicSummary}
Role distribution: ${roleSummary}

Recent post titles:
${recentTitles}

If there is very little substantive activity, say so directly.`;

              const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-api-key": ANTHROPIC_API_KEY!,
                  "anthropic-version": "2023-06-01",
                },
                body: JSON.stringify({
                  model: "claude-sonnet-4-20250514",
                  max_tokens: 300,
                  messages: [{ role: "user", content: summaryPrompt }],
                }),
              });

              const anthropicData = await anthropicRes.json();
              const summaryText = anthropicData.content?.[0]?.text || null;

              if (summaryText && skoolProfile.user_id) {
                await sql`
                  UPDATE skool_members
                  SET ai_summary = ${summaryText}, summary_generated_at = NOW()
                  WHERE user_id = ${skoolProfile.user_id}
                `;
                skoolProfile.ai_summary = summaryText;
                skoolProfile.summary_generated_at = new Date().toISOString();
              }
            } catch (summaryErr) {
              console.error("AI summary generation failed:", summaryErr);
              // Non-fatal — page loads without summary
            }
          }
        }
      }
    } catch (e) {
      console.error("Skool query failed:", e);
      // Non-fatal — return HubSpot data without Skool
    }
  }

  return NextResponse.json({
    contactId,
    firstname: props.firstname ?? "",
    lastname: props.lastname ?? "",
    email: props.email ?? "",
    vtg_current_membership_tier: props.vtg_current_membership_tier ?? null,
    vtg_current_membership_status: props.vtg_current_membership_status ?? null,
    vtg_billing_source: props.vtg_billing_source ?? null,
    vtg_recharge_subscription_id: props.vtg_recharge_subscription_id ?? null,
    vtg_stripe_subscription_id: props.vtg_stripe_subscription_id ?? null,
    membershipRecords,
    deals,
    skoolProfile,
    skoolPosts,
    skoolComments,
    topicAggregation,
    roleDistribution,
    revenueSnapshot: {
      total: totalRevenue,
      cancelled: totalCancelled,
      refunded: totalRefunded,
    },
  });
}
