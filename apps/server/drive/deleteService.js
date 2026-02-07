const { createDriveClient } = require("./driveClient");
const { loadToken } = require("../store/tokenStore");

/**
 * Check if folder is empty
 */
async function isFolderEmpty(folderId) {
  const sourceTokens = loadToken("source");

  const sourceDrive = createDriveClient(
    sourceTokens,
    `${process.env.BASE_URL}/auth/source/callback`
  );

  const res = await sourceDrive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id)",
  });

  return res.data.files.length === 0;
}

/**
 * Delete folder only if empty
 */
async function deleteSourceFolderSafe(folderId) {
  const sourceTokens = loadToken("source");

  const sourceDrive = createDriveClient(
    sourceTokens,
    `${process.env.BASE_URL}/auth/source/callback`
  );

  const empty = await isFolderEmpty(folderId);

  if (!empty) {
    console.log("⚠️ Folder not empty, skipping delete:", folderId);
    return false;
  }

  await sourceDrive.files.delete({ fileId: folderId });

  console.log("🗑️ Deleted Empty Source Folder:", folderId);
  return true;
}

module.exports = { deleteSourceFolderSafe };
