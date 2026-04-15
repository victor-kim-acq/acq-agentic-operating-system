'use client';

import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import DateRangeFilter from '@/components/ui/DateRangeFilter';

import { today, sixWeeksAgo } from './helpers';

import ActivationKPIs from './ActivationKPIs';
import ChatPanel from './ChatPanel';

export default function DashboardPage() {
  const [startDate, setStartDate] = useState(sixWeeksAgo);
  const [endDate, setEndDate] = useState(today);

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--page-bg)' }}>
      <div className="max-w-[1600px] mx-auto space-y-10">
        <PageHeader title="Dashboard" />

        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartChange={setStartDate}
          onEndChange={setEndDate}
          onReset={() => { setStartDate(sixWeeksAgo()); setEndDate(today()); }}
        />

        <ChatPanel />

        <ActivationKPIs startDate={startDate} endDate={endDate} />
      </div>
    </div>
  );
}
