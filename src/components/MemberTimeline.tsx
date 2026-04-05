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

const PIPELINE_NAMES: Record<string, string> = {
  "865935129": "ACQ Vantage",
  "1028710734": "L3 Workshops",
  "1028710730": "L1",
};

const DEAL_COLORS = [
  {
    circle: "text-blue-600 ring-2 ring-blue-400",
    pillBg: "bg-blue-50",
    cardDeal: "bg-blue-50 border-blue-200",
    cardMembership: "bg-blue-50/50 border-blue-200/60",
  },
  {
    circle: "text-amber-600 ring-2 ring-amber-400",
    pillBg: "bg-amber-50",
    cardDeal: "bg-amber-50 border-amber-200",
    cardMembership: "bg-amber-50/50 border-amber-200/60",
  },
  {
    circle: "text-violet-600 ring-2 ring-violet-400",
    pillBg: "bg-violet-50",
    cardDeal: "bg-violet-50 border-violet-200",
    cardMembership: "bg-violet-50/50 border-violet-200/60",
  },
  {
    circle: "text-teal-600 ring-2 ring-teal-400",
    pillBg: "bg-teal-50",
    cardDeal: "bg-teal-50 border-teal-200",
    cardMembership: "bg-teal-50/50 border-teal-200/60",
  },
  {
    circle: "text-rose-600 ring-2 ring-rose-400",
    pillBg: "bg-rose-50",
    cardDeal: "bg-rose-50 border-rose-200",
    cardMembership: "bg-rose-50/50 border-rose-200/60",
  },
];

const DEFAULT_STYLES = {
  circle: "text-slate-500 ring-2 ring-slate-300",
  pillBg: "bg-slate-50",
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
        className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors leading-tight"
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
    </div>
  );
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
}

function DateBadge({
  date,
  badgeClass,
}: {
  date: string;
  badgeClass: string;
}) {
  return (
    <div
      className={`px-2 py-1 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-semibold z-10 whitespace-nowrap ${badgeClass}`}
    >
      {formatShortDate(date)}
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
      label: PIPELINE_NAMES[d.properties.pipeline ?? ""] ?? d.properties.pipeline ?? "Deal",
      sub: d.properties.dealstage || "",
      detail: d.properties.amount ? `$${parseFloat(d.properties.amount).toLocaleString()}` : "",
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
        pillBg: DEFAULT_STYLES.pillBg,
        cardClass: DEFAULT_STYLES.card,
      };
    }
    return {
      circleClass: colorGroup.circle,
      pillBg: colorGroup.pillBg,
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
        className="overflow-x-auto scrollbar-thin min-h-[280px]"
      >
        <div className="relative flex gap-6 px-8 min-h-[280px]">
          {/* Horizontal connector line — vertically centered */}
          <div className="absolute left-0 right-0 h-px bg-slate-200 top-1/2 -translate-y-px" />

          {events.map((event, i) => {
            const href =
              event.type === "membership"
                ? `https://app.hubspot.com/contacts/21368823/record/2-57143627/${event.id}`
                : `https://app.hubspot.com/contacts/21368823/record/0-3/${event.id}`;
            const { circleClass, pillBg, cardClass } = getStyles(event);
            const isAbove = i % 2 === 0;

            return (
              <div
                key={`${event.type}-${event.id}`}
                className="relative flex-1 min-w-[120px] max-w-[200px] flex-shrink-0 flex flex-col items-center"
              >
                {/* Date badge — absolutely centered on the horizontal line */}
                <div className="absolute top-1/2 -translate-y-1/2 z-10">
                  <DateBadge date={event.date} badgeClass={`${circleClass} ${pillBg}`} />
                </div>

                {isAbove ? (
                  <>
                    <div className="w-full flex-1 flex flex-col justify-end pb-5">
                      <EventCard event={event} href={href} cardClass={cardClass} />
                    </div>
                    <div className="flex-1" />
                  </>
                ) : (
                  <>
                    <div className="flex-1" />
                    <div className="w-full flex-1 flex flex-col justify-start pt-5">
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
