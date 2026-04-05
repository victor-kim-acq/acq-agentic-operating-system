"use client";

import { useRef, useEffect } from "react";

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
    <div className={`rounded-lg border p-2.5 shadow-sm ${cardClass}`}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors leading-tight truncate block"
      >
        {event.label}
      </a>
      {event.detail && (
        <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
          {event.detail}
        </p>
      )}
      {event.sub && (
        <p className="text-[11px] text-slate-500 capitalize mt-0.5 leading-tight">
          {event.sub.replace(/_/g, " ")}
        </p>
      )}
      <p className="text-[11px] text-slate-400 mt-1">{formatDate(event.date)}</p>
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
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to right (most recent) on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, []);

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
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
    <div className="relative">
      {/* Left fade */}
      <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      {/* Right fade */}
      <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-thin"
      >
        <div className="relative flex gap-4 px-4" style={{ minWidth: "min-content" }}>
          {/* Horizontal connector line — vertically centered */}
          <div className="absolute left-0 right-0 h-px bg-slate-200 top-1/2 -translate-y-px" />

          {events.map((event, i) => {
            const href =
              event.type === "membership"
                ? `https://app.hubspot.com/contacts/21368823/record/2-57143627/${event.id}`
                : `https://app.hubspot.com/contacts/21368823/record/0-3/${event.id}`;
            const { circleClass, cardClass } = getStyles(event);
            const isAbove = i % 2 === 0;

            return (
              <div
                key={`${event.type}-${event.id}`}
                className="flex-shrink-0 w-44 flex flex-col items-center"
              >
                {isAbove ? (
                  <>
                    <div className="w-full flex-1 flex flex-col justify-end pb-2">
                      <EventCard event={event} href={href} cardClass={cardClass} />
                    </div>
                    <CircleMarker type={event.type} circleClass={circleClass} />
                    <div className="flex-1" />
                  </>
                ) : (
                  <>
                    <div className="flex-1" />
                    <CircleMarker type={event.type} circleClass={circleClass} />
                    <div className="w-full flex-1 flex flex-col justify-start pt-2">
                      <EventCard event={event} href={href} cardClass={cardClass} />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
