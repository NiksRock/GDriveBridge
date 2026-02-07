const { createDriveClient } = require("./driveClient");
const { loadToken } = require("../store/tokenStore");

/**
 * List all folders from Source Google Drive
 */
async function listSourceFolders() {
  const tokens = loadToken("source");

  if (!tokens) {
    throw new Error("Source account not authenticated");
  }

  const redirectUri = `${process.env.BASE_URL}/auth/source/callback`;

  const drive = createDriveClient(tokens, redirectUri);

  const res = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: "files(id, name)",
  });

  return res.data.files;
}
/**
 * List all files inside a given Source folder
 */
async function listFilesInSourceFolder(folderId) {
  const tokens = loadToken("source");

  if (!tokens) {
    throw new Error("Source account not authenticated");
  }

  const redirectUri = `${process.env.BASE_URL}/auth/source/callback`;

  const drive = createDriveClient(tokens, redirectUri);

  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id, name, mimeType, size)",
  });

  return res.data.files;
}
module.exports = {
  listSourceFolders,
  listFilesInSourceFolder,
};