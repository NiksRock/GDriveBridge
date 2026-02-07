const express = require("express");
const router = express.Router();

const { createOAuthClient, SCOPES } = require("./googleClient");
const { saveToken } = require("../store/tokenStore");

router.get("/source", (req, res) => {
  const redirectUri = `${process.env.BASE_URL}/auth/source/callback`;
  const client = createOAuthClient(redirectUri);

  const url = client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  res.redirect(url);
});

router.get("/source/callback", async (req, res) => {
  const code = req.query.code;

  const redirectUri = `${process.env.BASE_URL}/auth/source/callback`;
  const client = createOAuthClient(redirectUri);

  const { tokens } = await client.getToken(code);

  saveToken("source", tokens);

  res.send("✅ Source Account Connected Successfully");
});

module.exports = router;
