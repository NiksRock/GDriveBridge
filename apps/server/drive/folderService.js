const { createDriveClient } = require("./driveClient");
const { loadToken } = require("../store/tokenStore");

/**
 * List children (files + folders) of a folder
 */
async function listFolderChildren(folderId) {
  const sourceTokens = loadToken("source");

  const sourceDrive = createDriveClient(
    sourceTokens,
    `${process.env.BASE_URL}/auth/source/callback`
  );

  const res = await sourceDrive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id, name, mimeType)",
  });

  return res.data.files;
}

module.exports = { listFolderChildren };
