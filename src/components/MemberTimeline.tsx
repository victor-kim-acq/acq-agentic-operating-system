"use client";

interface MembershipRecord {
  id: string;
  properties: Record<string, string | null>;
  associatedDealId?: string;
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
  detail: string;
  id: string;
  dealId: string | null;
}

interface MemberTimelineProps {
  membershipRecords: MembershipRecord[];
  deals: Deal[];
}

const DEAL_COLORS = [
  {
    circle: "text-blue-600 ring-2 ring-blue-400",
    cardDeal: "bg-blue-50 border-blue-200",
    cardMembership: "bg-blue-50/50 border-blue-200/60",
  },
  {
    circle: "text-amber-600 ring-2 ring-amber-400",
    cardDeal: "bg-amber-50 border-amber-200",
    cardMembership: "bg-amber-50/50 border-amber-200/60",
  },
  {
    circle: "text-violet-600 ring-2 ring-violet-400",
    cardDeal: "bg-violet-50 border-violet-200",
    cardMembership: "bg-violet-50/50 border-violet-200/60",
  },
  {
    circle: "text-teal-600 ring-2 ring-teal-400",
    cardDeal: "bg-teal-50 border-teal-200",
    cardMembership: "bg-teal-50/50 border-teal-200/60",
  },
  {
    circle: "text-rose-600 ring-2 ring-rose-400",
    cardDeal: "bg-rose-50 border-rose-200",
    cardMembership: "bg-rose-50/50 border-rose-200/60",
  },
];

const DEFAULT_STYLES = {
  circle: "text-slate-500 ring-2 ring-slate-300",
  card: "bg-white border-slate-200/80",
};

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
  cardClass,
}: {
  event: TimelineEvent;
  href: string;
  cardClass: string;
}) {
  return (
    <div className={`rounded-lg border p-3 shadow-sm ${cardClass}`}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
      >
        {event.label}
      </a>
      {event.detail && (
        <p className="text-xs text-slate-500 mt-0.5">{event.detail}</p>
      )}
      {event.sub && (
        <p className="text-xs text-slate-500 capitalize mt-0.5">
          {event.sub.replace(/_/g, " ")}
        </p>
      )}
      <p className="text-xs text-slate-400 mt-1">{formatDate(event.date)}</p>
    </div>
  );
}

function CircleMarker({
  type,
  circleClass,
}: {
  type: "membership" | "deal";
  circleClass: string;
}) {
  return (
    <div
      className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-semibold z-10 bg-white ${circleClass}`}
    >
      {type === "membership" ? "M" : "D"}
    </div>
  );
}

export default function MemberTimeline({
  membershipRecords,
  deals,
}: MemberTimelineProps) {
  // Build color map: assign colors to deals in chronological order
  const dealColorMap = new Map<string, (typeof DEAL_COLORS)[number]>();
  const sortedDeals = [...deals].sort((a, b) => {
    const dateA = a.properties.createdate || a.properties.closedate || "";
    const dateB = b.properties.createdate || b.properties.closedate || "";
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });
  sortedDeals.forEach((d, i) => {
    dealColorMap.set(d.id, DEAL_COLORS[i % DEAL_COLORS.length]);
  });

  const events: TimelineEvent[] = [
    ...membershipRecords.map((r) => {
      const tier = r.properties.vtg_membership_tier || null;
      const billingSource = r.properties.vtg_billing_source || null;
      const amount = r.properties.vtg_mrr
        ? `$${parseFloat(r.properties.vtg_mrr).toLocaleString()}`
        : null;
      const detailParts = [tier, billingSource, amount].filter(
        (v): v is string => v != null && v !== ""
      );
      const status = r.properties.vtg_status || "Membership";
      return {
        date: r.properties.vtg_billing_date || r.properties.hs_createdate || "",
        type: "membership" as const,
        label: status.charAt(0).toUpperCase() + status.slice(1),
        sub: "",
        detail: detailParts.join(" \u00b7 "),
        id: r.id,
        dealId: r.associatedDealId ?? null,
      };
    }),
    ...deals.map((d) => ({
      date: d.properties.createdate || d.properties.closedate || "",
      type: "deal" as const,
      label: d.properties.dealname || "Deal",
      sub: d.properties.dealstage || "",
      detail: "",
      id: d.id,
      dealId: d.id,
    })),
  ]
    .filter((e) => e.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (events.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-4">No timeline events found.</p>
    );
  }

  function getStyles(event: TimelineEvent) {
    const colorGroup = event.dealId
      ? dealColorMap.get(String(event.dealId))
      : null;
    if (!colorGroup) {
      return {
        circleClass: DEFAULT_STYLES.circle,
        cardClass: DEFAULT_STYLES.card,
      };
    }
    return {
      circleClass: colorGroup.circle,
      cardClass:
        event.type === "deal"
          ? colorGroup.cardDeal
          : colorGroup.cardMembership,
    };
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
            const { circleClass, cardClass } = getStyles(event);
            return (
              <div
                key={`${event.type}-${event.id}`}
                className="flex gap-3 relative items-start"
              >
                <CircleMarker type={event.type} circleClass={circleClass} />
                <div className="flex-1 pt-0.5">
                  <EventCard event={event} href={href} cardClass={cardClass} />
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
            const { circleClass, cardClass } = getStyles(event);

            return (
              <div
                key={`${event.type}-${event.id}`}
                className="relative flex items-start"
              >
                {/* Left side content */}
                <div className="w-[calc(50%-18px)] flex-shrink-0">
                  {isLeft && (
                    <EventCard event={event} href={href} cardClass={cardClass} />
                  )}
                </div>

                {/* Center circle */}
                <div className="w-9 flex-shrink-0 flex justify-center z-10">
                  <CircleMarker type={event.type} circleClass={circleClass} />
                </div>

                {/* Right side content */}
                <div className="w-[calc(50%-18px)] flex-shrink-0">
                  {!isLeft && (
                    <EventCard event={event} href={href} cardClass={cardClass} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
