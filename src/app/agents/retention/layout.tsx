import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Retention & Activation · ACQ Vantage',
};

export default function RetentionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
