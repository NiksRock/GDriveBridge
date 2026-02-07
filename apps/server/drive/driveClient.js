const { google } = require("googleapis");
const credentials = require("../credentials.json");

/**
 * Creates a Drive client for a given token + redirect URI
 */
function createDriveClient(tokens, redirectUri) {
  const oauthClient = new google.auth.OAuth2(
    credentials.web.client_id,
    credentials.web.client_secret,
    redirectUri
  );

  oauthClient.setCredentials(tokens);

  return google.drive({
    version: "v3",
    auth: oauthClient,
  });
}

module.exports = { createDriveClient };
