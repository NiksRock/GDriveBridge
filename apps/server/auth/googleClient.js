const { google } = require("googleapis");
const credentials = require("../credentials.json");

/**
 * Creates a fresh OAuth client (important for dual accounts)
 */
function createOAuthClient(redirectUri) {
  return new google.auth.OAuth2(
    credentials.web.client_id,
    credentials.web.client_secret,
    redirectUri
  );
}

const SCOPES = ["https://www.googleapis.com/auth/drive"];

module.exports = { createOAuthClient, SCOPES };
