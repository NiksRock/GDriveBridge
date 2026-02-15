import { useState } from 'react';
import { createTransfer } from '../api/transfers';

export function CreateTransferPage() {
  const [sourceIds, setSourceIds] = useState<string>('');
  const [destinationFolderId, setDestinationFolderId] = useState<string>('');
  const [mode, setMode] = useState<'copy' | 'move'>('copy');

  async function handleSubmit() {
    await createTransfer({
      sourceFileIds: sourceIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
      destinationFolderId,
      mode,
    });

    alert('Transfer started');
  }

  function handleModeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (value === 'copy' || value === 'move') {
      setMode(value);
    }
  }

  return (
    <div>
      <h1>Create Transfer</h1>

      <input
        placeholder="Source File IDs (comma separated)"
        value={sourceIds}
        onChange={(e) => setSourceIds(e.target.value)}
      />

      <input
        placeholder="Destination Folder ID"
        value={destinationFolderId}
        onChange={(e) => setDestinationFolderId(e.target.value)}
      />

      <select value={mode} onChange={handleModeChange}>
        <option value="copy">Copy</option>
        <option value="move">Move</option>
      </select>

      <button onClick={handleSubmit}>Start</button>
    </div>
  );
}
