"use client";

interface MembershipRecord {
  id: string;
  properties: Record<string, string | null>;
}

interface Deal {
  id: string;
  properties: Record<string, string | null>;
}

interface TimelineEvent {
  date: string;
  type: "membership" | "deal";
  label: string;
  sub: string;
  id: string;
}

interface MemberTimelineProps {
  membershipRecords: MembershipRecord[];
  deals: Deal[];
}

export default function MemberTimeline({
  membershipRecords,
  deals,
}: MemberTimelineProps) {
  const events: TimelineEvent[] = [
    ...membershipRecords.map((r) => ({
      date: r.properties.start_date || r.properties.hs_createdate || "",
      type: "membership" as const,
      label: r.properties.membership_name || "Membership",
      sub: [r.properties.membership_status, r.properties.billing_source]
        .filter(Boolean)
        .join(" · ") || "",
      id: r.id,
    })),
    ...deals.map((d) => ({
      date: d.properties.createdate || d.properties.closedate || "",
      type: "deal" as const,
      label: d.properties.dealname || "Deal",
      sub: d.properties.dealstage || "",
      id: d.id,
    })),
  ]
    .filter((e) => e.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (events.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-4">No timeline events found.</p>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-200" />
      <div className="space-y-4">
        {events.map((event) => (
          <div key={`${event.type}-${event.id}`} className="flex gap-4 relative">
            <div
              className={`mt-1 w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs z-10 ${
                event.type === "membership"
                  ? "bg-blue-100 text-blue-600"
                  : "bg-emerald-100 text-emerald-600"
              }`}
            >
              {event.type === "membership" ? "M" : "D"}
            </div>
            <div className="flex-1 pb-1">
              <a
                href={
                  event.type === "membership"
                    ? `https://app.hubspot.com/contacts/21368823/record/2-57143627/${event.id}`
                    : `https://app.hubspot.com/contacts/21368823/record/0-3/${event.id}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-500 hover:underline"
              >
                {event.label}
              </a>
              {event.sub && (
                <p className="text-xs text-slate-500 capitalize">
                  {event.sub.replace(/_/g, " ")}
                </p>
              )}
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date(event.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
