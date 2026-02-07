const express = require("express");
const router = express.Router();

const { createOAuthClient, SCOPES } = require("./googleClient");
const { saveToken } = require("../store/tokenStore");

router.get("/destination", (req, res) => {
  const redirectUri = `${process.env.BASE_URL}/auth/destination/callback`;

  const client = createOAuthClient(redirectUri);

  const frontendRedirect =
    req.query.redirect || process.env.FRONTEND_URL;

  const url = client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",

    state: JSON.stringify({
      redirect: frontendRedirect,
      type: "destination",
    }),
  });

  res.redirect(url);
});


router.get("/destination/callback", async (req, res) => {
  const code = req.query.code;

  const redirectUri = `${process.env.BASE_URL}/auth/destination/callback`;
  const client = createOAuthClient(redirectUri);

  const { tokens } = await client.getToken(code);

  saveToken("destination", tokens);

  console.log("✅ Destination Tokens Saved");

  const state = JSON.parse(req.query.state || "{}");

  return res.redirect(state.redirect || process.env.FRONTEND_URL);
});

module.exports = router;
