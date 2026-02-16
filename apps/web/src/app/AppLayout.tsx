export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <header
        style={{
          borderBottom: '1px solid #ddd',
          padding: '16px',
          fontWeight: 'bold',
        }}
      >
        GDriveBridge v2
      </header>

      <main style={{ padding: '24px' }}>{children}</main>
    </div>
  );
}
