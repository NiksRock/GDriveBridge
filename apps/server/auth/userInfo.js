const express = require("express");
const router = express.Router();
const { google } = require("googleapis");

const { loadToken, clearToken } = require("../store/tokenStore");

router.get("/me/:type", async (req, res) => {
  const type = req.params.type; // source or destination
  const token = loadToken(type);

  if (!token) {
    return res.json({ success: false, connected: false });
  }

  const oauth2 = new google.auth.OAuth2();
  oauth2.setCredentials(token);

  const oauth2Api = google.oauth2({
    auth: oauth2,
    version: "v2",
  });

  const user = await oauth2Api.userinfo.get();

  res.json({
    success: true,
    connected: true,
    profile: {
      name: user.data.name,
      email: user.data.email,
      picture: user.data.picture,
    },
  });
});


// ✅ Disconnect endpoint
router.post("/disconnect/:type", (req, res) => {
  const type = req.params.type;

  console.log(type)
  clearToken(type);

  res.json({
    success: true,
    message: `${type} disconnected`,
  });
});

module.exports = router;
