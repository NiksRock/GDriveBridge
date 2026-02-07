import { useEffect, useState } from "react";
import { fetchSourceFolders, startTransfer, fetchJobStatus, fetchAccount, disconnectAccount } from "../api";

export default function Dashboard() {
    const [folders, setFolders] = useState([]);
    const [selectedFolders, setSelectedFolders] = useState([]);
    const [deleteSource, setDeleteSource] = useState(false);
    const [jobId, setJobId] = useState("");
    const [job, setJob] = useState(null);
    const [sourceAccount, setSourceAccount] = useState(null);
    const [destAccount, setDestAccount] = useState(null);

    // ✅ Poll job status every 2s
    useEffect(() => {
        if (!jobId) return;

        const interval = setInterval(async () => {
            const data = await fetchJobStatus(jobId);

            if (data.success) {
                setJob(data.job);

                if (data.job.status === "completed") {
                    clearInterval(interval);
                }
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [jobId]);


    // Load folders after auth
    useEffect(() => {
        async function loadAccounts() {
            const source = await fetchAccount("source");
            const dest = await fetchAccount("destination");

            if (source.connected) setSourceAccount(source.profile);
            if (dest.connected) setDestAccount(dest.profile);
        }

        loadAccounts();
        async function load() {
            const data = await fetchSourceFolders();
            if (data.success) setFolders(data.folders);
        }

        load();
    }, []);
    async function handleTransfer() {
        if (selectedFolders.length === 0) {
            return alert("Select at least one folder!");
        }

        // Start transfer for each selected folder
        for (let folderId of selectedFolders) {
            const result = await startTransfer(folderId, deleteSource);

            if (result.success) {
                setJobId(result.jobId); // last jobId shown
            }
        }

        alert("🚀 Transfer started for selected folders!");
    }

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

            <main className="mx-auto max-w-6xl px-6 py-10 space-y-6">
                {job && (
                    <div className="mt-6 rounded-xl border p-4">
                        <h3 className="font-semibold">📊 Transfer Progress</h3>

                        <p className="text-sm text-gray-600 mt-1">
                            {job.completed} / {job.totalFiles} files moved
                        </p>

                        <div className="mt-3 h-3 w-full rounded-full bg-gray-200">
                            <div
                                className="h-3 rounded-full bg-green-600 transition-all"
                                style={{
                                    width: `${Math.round(
                                        (job.completed / job.totalFiles) * 100
                                    )}%`,
                                }}
                            />
                        </div>

                        {job.failed.length > 0 && (
                            <div className="mt-4 text-sm text-red-600">
                                <p className="font-semibold">❌ Failed Files:</p>
                                <ul className="list-disc ml-5">
                                    {job.failed.map((f, i) => (
                                        <li key={i}>{f}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <p className="mt-3 text-sm">
                            Status:{" "}
                            <span className="font-mono font-semibold">
                                {job.status}
                            </span>
                        </p>
                    </div>
                )}


                <div className="flex gap-6 mt-6">

                    {/* Source */}
                    <div className="flex-1 border rounded-xl p-4">
                        <h3 className="font-semibold">Source Account</h3>

                        {sourceAccount ? (
                            <div className="mt-3 flex items-center gap-3">
                                <img
                                    src={sourceAccount.picture}
                                    className="w-10 h-10 rounded-full"
                                />
                                <div>
                                    <p className="font-medium">{sourceAccount.name}</p>
                                    <p className="text-sm text-gray-500">{sourceAccount.email}</p>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() =>
                                (window.location.href = "http://localhost:5000/auth/source?redirect=" +
                                    encodeURIComponent(window.location.origin))
                                }
                                className="mt-3 rounded-xl bg-black px-4 py-2 text-white"
                            >
                                Connect Source
                            </button>
                        )}

                        {sourceAccount && (
                            <button
                                onClick={async () => {
                                    await disconnectAccount("source");
                                    setSourceAccount(null);
                                }}
                                className="mt-3 text-sm text-red-600"
                            >
                                Disconnect
                            </button>
                        )}
                    </div>


                    {/* Destination */}
                    <div className="flex-1 border rounded-xl p-4">
                        <h3 className="font-semibold">Destination Account</h3>

                        {destAccount ? (
                            <div className="mt-3 flex items-center gap-3">
                                <img
                                    src={destAccount.picture}
                                    className="w-10 h-10 rounded-full"
                                />
                                <div>
                                    <p className="font-medium">{destAccount.name}</p>
                                    <p className="text-sm text-gray-500">{destAccount.email}</p>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() =>
                                (window.location.href =
                                    "http://localhost:5000/auth/destination?redirect=" +
                                    encodeURIComponent(window.location.origin))
                                }
                                className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-white"
                            >
                                Connect Destination
                            </button>
                        )}

                        {destAccount && (
                            <button
                                onClick={async () => {
                                    await disconnectAccount("destination");
                                    setDestAccount(null);
                                }}
                                className="mt-3 text-sm text-red-600"
                            >
                                Disconnect
                            </button>
                        )}
                    </div>

                </div>

                {/* Folder Picker */}
                <div className="rounded-2xl border bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold">Step 2: Select Folders</h2>

                    <div className="mt-4 space-y-2 max-h-64 overflow-auto border rounded-xl p-3">
                        {folders.map((f) => (
                            <label
                                key={f.id}
                                className="flex items-center gap-2 text-sm"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedFolders.includes(f.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedFolders([...selectedFolders, f.id]);
                                        } else {
                                            setSelectedFolders(
                                                selectedFolders.filter((id) => id !== f.id)
                                            );
                                        }
                                    }}
                                />

                                📁 {f.name}
                            </label>
                        ))}
                    </div>

                    {/* Delete Option */}
                    <label className="mt-4 flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={deleteSource}
                            onChange={(e) => setDeleteSource(e.target.checked)}
                        />
                        Delete folder from source after transfer
                    </label>
                    <p className="mt-3 text-sm text-gray-600">
                        Selected: {selectedFolders.length} folders
                    </p>

                    {/* Transfer Button */}
                    <button
                        onClick={handleTransfer}
                        className="mt-6 rounded-xl bg-green-600 px-4 py-2 text-white"
                    >
                        🚀 Start Transfer
                    </button>

                    {/* Job Info */}
                    {jobId && (
                        <p className="mt-4 text-sm text-gray-600">
                            ✅ Transfer started! Job ID:{" "}
                            <span className="font-mono">{jobId}</span>
                        </p>
                    )}
                </div>
            </main>
        </div>
    );
}
