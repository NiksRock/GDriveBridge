export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <h1 className="text-xl font-bold">🚀 GDriveBridge</h1>
          <p className="text-sm text-gray-500">
            Move folders securely between Google accounts
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">
            Step 1: Connect Accounts
          </h2>

          <div className="mt-6 flex gap-4">
            <button className="rounded-xl bg-black px-4 py-2 text-white">
              Connect Source
            </button>

            <button className="rounded-xl bg-blue-600 px-4 py-2 text-white">
              Connect Destination
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
