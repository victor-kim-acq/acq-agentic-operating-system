import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Activation · ACQ Vantage',
};

export default function ActivationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
