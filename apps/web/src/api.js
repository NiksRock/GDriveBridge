const API_BASE = "http://localhost:5000";

export async function fetchSourceFolders() {
  const res = await fetch(`${API_BASE}/drive/source/folders/json`);
  return res.json();
}

export async function startTransfer(folderId, deleteSource) {
  const res = await fetch(`${API_BASE}/drive/transfer/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folderId, deleteSource }),
  });

  return res.json();
}
export async function fetchJobStatus(jobId) {
  const res = await fetch(`${API_BASE}/drive/job/${jobId}`);
  return res.json();
}
export async function startBulkTransfer(folderIds, deleteSource) {
  const res = await fetch(`${API_BASE}/drive/transfer/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folderIds, deleteSource }),
  });

  return res.json();
}
export async function fetchAccount(type) {
  const res = await fetch(`${API_BASE}/auth/me/${type}`);
  return res.json();
}

export async function disconnectAccount(type) {
  const res = await fetch(`${API_BASE}/auth/disconnect/${type}`, {
    method: "POST",
  });
  return res.json();
}
