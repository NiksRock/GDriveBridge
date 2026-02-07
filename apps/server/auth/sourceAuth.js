const express = require("express");
const router = express.Router();

const { createOAuthClient, SCOPES } = require("./googleClient");
const { saveToken } = require("../store/tokenStore");

router.get("/source", (req, res) => {
  const redirectUri = `${process.env.BASE_URL}/auth/source/callback`;

  // Create OAuth client
  const client = createOAuthClient(redirectUri);

  // Frontend return URL
  const frontendRedirect =
    req.query.redirect || process.env.FRONTEND_URL;

  // Generate Google Auth URL
  const url = client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",

    // ✅ Send redirect info safely
    state: JSON.stringify({
      redirect: frontendRedirect,
      type: "source",
    }),
  });

  res.redirect(url);
});

router.get("/source/callback", async (req, res) => {
  const code = req.query.code;

  const redirectUri = `${process.env.BASE_URL}/auth/source/callback`;
  const client = createOAuthClient(redirectUri);

  // Exchange code for tokens
  const { tokens } = await client.getToken(code);

  // Save tokens
  saveToken("source", tokens);

  console.log("✅ Source Tokens Saved");

  // ✅ Decode redirect target from state
  const state = JSON.parse(req.query.state || "{}");

  // ✅ Redirect back to frontend dashboard
  return res.redirect(state.redirect || process.env.FRONTEND_URL);
});


module.exports = router;
