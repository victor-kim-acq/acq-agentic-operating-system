import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@/lib/session";

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
    "membership_tier",
    "membership_status",
    "start_date",
    "end_date",
    "billing_source",
    "membership_name",
    "recharge_subscription_id",
    "stripe_subscription_id",
  ];

  const dealProps = ["dealname", "dealstage", "amount", "closedate", "createdate"];

  const [membershipRecords, deals] = await Promise.all([
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
  ]);

  return NextResponse.json({
    contactId,
    firstname: props.firstname ?? "",
    lastname: props.lastname ?? "",
    email: props.email ?? "",
    vtg_current_membership_tier: props.vtg_current_membership_tier ?? null,
    vtg_current_membership_status: props.vtg_current_membership_status ?? null,
    vtg_billing_source: props.vtg_billing_source ?? null,
    membershipRecords,
    deals,
  });
}
