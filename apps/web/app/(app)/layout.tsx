export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex h-screen bg-background">{children}</div>;
}
