// HUBSPOT_ACCESS_TOKEN — HubSpot API bearer token

import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@/lib/session";

export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";

  const res = await fetch(
    "https://api.hubapi.com/crm/v3/objects/contacts/search",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                operator: "CONTAINS_TOKEN",
                value: `*${q}*`,
              },
            ],
          },
          {
            filters: [
              {
                propertyName: "firstname",
                operator: "CONTAINS_TOKEN",
                value: `*${q}*`,
              },
            ],
          },
          {
            filters: [
              {
                propertyName: "lastname",
                operator: "CONTAINS_TOKEN",
                value: `*${q}*`,
              },
            ],
          },
        ],
        properties: [
          "firstname",
          "lastname",
          "email",
          "vtg_current_membership_tier",
          "vtg_current_membership_status",
          "vtg_billing_source",
        ],
        limit: 20,
      }),
    }
  );

  const data = await res.json();

  const results = (data.results ?? []).map(
    (c: { id: string; properties: Record<string, string> }) => ({
      contactId: c.id,
      firstname: c.properties?.firstname ?? "",
      lastname: c.properties?.lastname ?? "",
      email: c.properties?.email ?? "",
      vtg_current_membership_tier:
        c.properties?.vtg_current_membership_tier ?? null,
      vtg_current_membership_status:
        c.properties?.vtg_current_membership_status ?? null,
      vtg_billing_source: c.properties?.vtg_billing_source ?? null,
    })
  );

  return NextResponse.json({ results });
}
