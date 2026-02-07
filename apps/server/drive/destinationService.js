const { createDriveClient } = require("./driveClient");
const { loadToken } = require("../store/tokenStore");

/**
 * Create folder in destination account
 */
async function createDestinationFolder(name, parentId = null) {
  const destTokens = loadToken("destination");

  const destDrive = createDriveClient(
    destTokens,
    `${process.env.BASE_URL}/auth/destination/callback`
  );

  const folderMeta = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };

  if (parentId) folderMeta.parents = [parentId];

  const folder = await destDrive.files.create({
    requestBody: folderMeta,
    fields: "id",
  });

  return folder.data.id;
}

module.exports = { createDestinationFolder };
