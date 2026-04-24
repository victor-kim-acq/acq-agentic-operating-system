import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Member Health · ACQ Vantage',
};

export default function HealthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
