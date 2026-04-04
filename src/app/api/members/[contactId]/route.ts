import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@/lib/session";

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

  const dealProps = ["dealname", "dealstage", "amount", "closedate", "createdate"];

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
  });
}
