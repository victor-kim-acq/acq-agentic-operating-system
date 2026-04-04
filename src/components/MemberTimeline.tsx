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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function EventCard({
  event,
  href,
}: {
  event: TimelineEvent;
  href: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200/80 p-3 shadow-sm">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
      >
        {event.label}
      </a>
      {event.sub && (
        <p className="text-xs text-slate-500 capitalize mt-0.5">
          {event.sub.replace(/_/g, " ")}
        </p>
      )}
      <p className="text-xs text-slate-400 mt-1">{formatDate(event.date)}</p>
    </div>
  );
}

function CircleMarker({ type }: { type: "membership" | "deal" }) {
  return (
    <div
      className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-semibold z-10 bg-white ${
        type === "membership"
          ? "text-blue-600 ring-2 ring-blue-300"
          : "text-emerald-600 ring-2 ring-emerald-300"
      }`}
    >
      {type === "membership" ? "M" : "D"}
    </div>
  );
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
      sub:
        [r.properties.membership_status, r.properties.billing_source]
          .filter(Boolean)
          .join(" \u00b7 ") || "",
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
    <>
      {/* Mobile: single-column left-aligned */}
      <div className="md:hidden relative">
        <div
          className="absolute left-3.5 top-0 bottom-0 w-px"
          style={{ backgroundColor: "#e8ecf1" }}
        />
        <div className="space-y-4">
          {events.map((event) => {
            const href =
              event.type === "membership"
                ? `https://app.hubspot.com/contacts/21368823/record/2-57143627/${event.id}`
                : `https://app.hubspot.com/contacts/21368823/record/0-3/${event.id}`;
            return (
              <div
                key={`${event.type}-${event.id}`}
                className="flex gap-3 relative items-start"
              >
                <CircleMarker type={event.type} />
                <div className="flex-1 pt-0.5">
                  <EventCard event={event} href={href} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop: alternating left-right */}
      <div className="hidden md:block relative">
        {/* Center vertical line */}
        <div
          className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-px"
          style={{ backgroundColor: "#e8ecf1" }}
        />

        <div className="space-y-6">
          {events.map((event, i) => {
            const href =
              event.type === "membership"
                ? `https://app.hubspot.com/contacts/21368823/record/2-57143627/${event.id}`
                : `https://app.hubspot.com/contacts/21368823/record/0-3/${event.id}`;
            const isLeft = i % 2 === 0;

            return (
              <div
                key={`${event.type}-${event.id}`}
                className="relative flex items-start"
              >
                {/* Left side content */}
                <div className="w-[calc(50%-18px)] flex-shrink-0">
                  {isLeft && <EventCard event={event} href={href} />}
                </div>

                {/* Center circle */}
                <div className="w-9 flex-shrink-0 flex justify-center z-10">
                  <CircleMarker type={event.type} />
                </div>

                {/* Right side content */}
                <div className="w-[calc(50%-18px)] flex-shrink-0">
                  {!isLeft && <EventCard event={event} href={href} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
