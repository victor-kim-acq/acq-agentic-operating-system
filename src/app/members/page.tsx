"use client";

import { useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import MemberSearch from "@/components/MemberSearch";

export default function MembersPage() {
  const [unauthorized, setUnauthorized] = useState(false);

  if (unauthorized) {
    return (
      <div className="min-h-[calc(100vh-44px)] flex items-center justify-center" style={{ background: "var(--page-bg)" }}>
        <div className="text-center">
          <p className="mb-4" style={{ color: "var(--neutral-600)" }}>
            You need to log in to view member data.
          </p>
          <Link
            href="/members/login"
            className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors"
            style={{ background: "var(--neutral-900)" }}
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-44px)]" style={{ background: "var(--page-bg)" }}>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <PageHeader
            title="Members"
            subtitle="Search HubSpot contacts by name or email."
          />
        </div>

        <MemberSearch
          mode="full"
          onUnauthorized={() => setUnauthorized(true)}
        />
      </div>
    </div>
  );
}
