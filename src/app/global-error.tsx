"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="id">
      <body>
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <h2>Terjadi kesalahan</h2>
          <p>{error.message}</p>
          <button onClick={() => reset()}>Coba lagi</button>
        </div>
      </body>
    </html>
  )
}
