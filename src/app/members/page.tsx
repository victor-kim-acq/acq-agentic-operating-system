"use client";

import { useState } from "react";
import Link from "next/link";
import MemberSearch from "@/components/MemberSearch";

export default function MembersPage() {
  const [unauthorized, setUnauthorized] = useState(false);

  if (unauthorized) {
    return (
      <div className="min-h-[calc(100vh-44px)] bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">
            You need to log in to view member data.
          </p>
          <Link
            href="/members/login"
            className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-44px)] bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Members</h1>
          <p className="text-sm text-slate-500 mt-1">
            Search HubSpot contacts by name or email.
          </p>
        </div>

        <MemberSearch
          mode="full"
          onUnauthorized={() => setUnauthorized(true)}
        />
      </div>
    </div>
  );
}
