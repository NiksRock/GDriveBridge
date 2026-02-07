const { createDriveClient } = require("./driveClient");
const { loadToken } = require("../store/tokenStore");
const { retry } = require("../utils/retry");

/**
 * ✅ Get correct stream for ANY file type (with retry)
 */
async function getFileStream(sourceDrive, file) {
  // Google Workspace files need export
  if (file.mimeType.startsWith("application/vnd.google-apps")) {
    console.log("📄 Exporting Google File:", file.name);

    const exportMap = {
      "application/vnd.google-apps.document":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

      "application/vnd.google-apps.spreadsheet":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

      "application/vnd.google-apps.presentation":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    };

    const exportMime = exportMap[file.mimeType] || "application/pdf";

    // ✅ Retry export
    return await retry(() =>
      sourceDrive.files.export(
        {
          fileId: file.id,
          mimeType: exportMime,
        },
        { responseType: "stream" }
      )
    );
  }

  // ✅ Retry normal download
  return await retry(() =>
    sourceDrive.files.get(
      { fileId: file.id, alt: "media" },
      { responseType: "stream" }
    )
  );
}

/**
 * ✅ Move one file safely (Upload → Verify → Delete) with retry
 */
async function moveFile(file) {
  const sourceTokens = loadToken("source");
  const destTokens = loadToken("destination");

  const sourceDrive = createDriveClient(
    sourceTokens,
    `${process.env.BASE_URL}/auth/source/callback`
  );

  const destDrive = createDriveClient(
    destTokens,
    `${process.env.BASE_URL}/auth/destination/callback`
  );

  // 1. Get stream safely
  const fileStream = await getFileStream(sourceDrive, file);

  // 2. Upload to destination (with retry)
  const uploaded = await retry(() =>
    destDrive.files.create({
      requestBody: {
        name: file.name,
      },
      media: {
        body: fileStream.data,
      },
      fields: "id",
    })
  );

  console.log("✅ Uploaded:", file.name);

  // 3. Delete only after success (with retry)
  if (uploaded.data.id) {
    await retry(() =>
      sourceDrive.files.delete({
        fileId: file.id,
      })
    );

    console.log("🗑️ Deleted from Source:", file.name);
  }
}

module.exports = { moveFile };
