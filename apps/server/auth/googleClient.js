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

const SCOPES = [
  "https://www.googleapis.com/auth/drive",

  // ✅ Needed for profile + email display
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
];


module.exports = { createOAuthClient, SCOPES };
