export default function HomePage() {
  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 900, margin: "80px auto", padding: 24 }}>
      <h1>PRIME TECHNICAL MASTER</h1>
      <p>F&O Scanner — Upstox connection test</p>
      <a
        href="/api/upstox/login"
        style={{
          display: "inline-block",
          marginTop: 24,
          padding: "12px 18px",
          borderRadius: 8,
          background: "#6d28d9",
          color: "white",
          textDecoration: "none",
        }}
      >
        Connect Upstox
      </a>
    </main>
  );
}
