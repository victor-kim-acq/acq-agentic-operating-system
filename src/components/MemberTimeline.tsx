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
  "704159270": "L1",
  "704159271": "L3 Workshops",
  "865935129": "ACQ Vantage",
};

const DEAL_COLORS = [
  { accent: "var(--chart-1)", bg: "rgba(59, 130, 246, 0.06)", bgSolid: "rgba(59, 130, 246, 0.1)", border: "rgba(59, 130, 246, 0.3)" },
  { accent: "var(--chart-3)", bg: "rgba(245, 158, 11, 0.06)", bgSolid: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.3)" },
  { accent: "var(--chart-5)", bg: "rgba(139, 92, 246, 0.06)", bgSolid: "rgba(139, 92, 246, 0.1)", border: "rgba(139, 92, 246, 0.3)" },
  { accent: "var(--chart-2)", bg: "rgba(16, 185, 129, 0.06)", bgSolid: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.3)" },
  { accent: "var(--chart-4)", bg: "rgba(239, 68, 68, 0.06)", bgSolid: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.3)" },
];

const DEFAULT_COLOR = { accent: "var(--neutral-500)", bg: "var(--neutral-50)", bgSolid: "var(--neutral-100)", border: "var(--neutral-200)" };

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
}

function EventCard({
  event,
  href,
  colorGroup,
}: {
  event: TimelineEvent;
  href: string;
  colorGroup: typeof DEAL_COLORS[number];
}) {
  return (
    <div
      className="rounded-lg p-2.5"
      style={{
        background: event.type === "deal" ? colorGroup.bgSolid : colorGroup.bg,
        border: `2px ${event.type === "membership" ? "dashed" : "solid"} ${colorGroup.border}`,
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-medium transition-colors leading-tight"
        style={{ color: "var(--brand-primary)" }}
      >
        {event.label}
      </a>
      {event.detail && (
        <p className="text-[11px] mt-0.5 leading-tight" style={{ color: "var(--neutral-500)" }}>
          {event.detail}
        </p>
      )}
      {event.sub && (
        <p className="text-[11px] capitalize mt-0.5 leading-tight" style={{ color: "var(--neutral-500)" }}>
          {event.sub.replace(/_/g, " ")}
        </p>
      )}
    </div>
  );
}

function DateBadge({
  date,
  colorGroup,
}: {
  date: string;
  colorGroup: typeof DEAL_COLORS[number];
}) {
  return (
    <div
      className="px-2 py-1 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-semibold z-10 whitespace-nowrap"
      style={{
        background: colorGroup.bgSolid,
        color: colorGroup.accent,
        boxShadow: `0 0 0 2px ${colorGroup.border}`,
      }}
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, []);

  const dealColorMap = new Map<string, (typeof DEAL_COLORS)[number]>();
  const sortedDeals = [...deals].sort((a, b) => {
    const dateA = a.properties.createdate || a.properties.closedate || "";
    const dateB = b.properties.createdate || b.properties.closedate || "";
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });
  sortedDeals.forEach((d, i) => {
    dealColorMap.set(d.id, DEAL_COLORS[i % DEAL_COLORS.length]);
  });

  const dealMembershipMap = new Map<string, MembershipRecord>();
  for (const rec of membershipRecords) {
    if (rec.associatedDealId && !dealMembershipMap.has(rec.associatedDealId)) {
      dealMembershipMap.set(rec.associatedDealId, rec);
    }
  }

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
    ...deals.map((d) => {
      const assocMembership = dealMembershipMap.get(d.id);
      const detailParts = assocMembership
        ? [
            assocMembership.properties.vtg_membership_tier,
            assocMembership.properties.vtg_billing_source,
            assocMembership.properties.vtg_mrr
              ? `$${parseFloat(assocMembership.properties.vtg_mrr).toLocaleString()}`
              : null,
          ].filter((v): v is string => v != null && v !== "")
        : d.properties.amount
          ? [`$${parseFloat(d.properties.amount).toLocaleString()}`]
          : [];
      return {
        date: d.properties.createdate || d.properties.closedate || "",
        type: "deal" as const,
        label: (PIPELINE_NAMES[d.properties.pipeline ?? ""] ?? d.properties.pipeline ?? "Deal") + " Deal",
        sub: "",
        detail: detailParts.join(" \u00b7 "),
        id: d.id,
        dealId: d.id,
      };
    }),
  ]
    .filter((e) => e.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (events.length === 0) {
    return (
      <p className="text-sm py-4" style={{ color: "var(--neutral-400)" }}>No timeline events found.</p>
    );
  }

  function getColorGroup(event: TimelineEvent) {
    const colorGroup = event.dealId ? dealColorMap.get(String(event.dealId)) : null;
    return colorGroup ?? DEFAULT_COLOR;
  }

  return (
    <div className="relative">
      <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

      <div ref={scrollRef} className="overflow-x-auto scrollbar-thin min-h-[280px]">
        <div className="relative flex gap-6 px-8 min-h-[280px] min-w-fit">
          <div className="absolute left-0 right-0 h-px top-1/2 -translate-y-px" style={{ background: "var(--neutral-200)" }} />

          {events.map((event, i) => {
            const href =
              event.type === "membership"
                ? `https://app.hubspot.com/contacts/21368823/record/2-57143627/${event.id}`
                : `https://app.hubspot.com/contacts/21368823/record/0-3/${event.id}`;
            const colorGroup = getColorGroup(event);
            const isAbove = i % 2 === 0;

            return (
              <div key={`${event.type}-${event.id}`} className="min-w-[160px] max-w-[200px] flex-shrink-0 flex flex-col items-center">
                {isAbove ? (
                  <>
                    <div className="w-full flex-1 flex flex-col justify-end">
                      <EventCard event={event} href={href} colorGroup={colorGroup} />
                    </div>
                    <div className="w-px h-4" style={{ background: "var(--neutral-200)" }} />
                    <div className="z-10">
                      <DateBadge date={event.date} colorGroup={colorGroup} />
                    </div>
                    <div className="flex-1" />
                  </>
                ) : (
                  <>
                    <div className="flex-1" />
                    <div className="z-10">
                      <DateBadge date={event.date} colorGroup={colorGroup} />
                    </div>
                    <div className="w-px h-4" style={{ background: "var(--neutral-200)" }} />
                    <div className="w-full flex-1 flex flex-col justify-start">
                      <EventCard event={event} href={href} colorGroup={colorGroup} />
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
