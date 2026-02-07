const fs = require("fs");
const path = require("path");

const sourceFile = path.join(__dirname, "sourceToken.json");
const destFile = path.join(__dirname, "destToken.json");

function saveToken(type, token) {
  const file = type === "source" ? sourceFile : destFile;
  fs.writeFileSync(file, JSON.stringify(token, null, 2));
}

function loadToken(type) {
  const file = type === "source" ? sourceFile : destFile;
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file));
}
function clearToken(type) {
  const file =
    type === "source" ? sourceFile : destFile;

  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
}

module.exports = { saveToken, loadToken,clearToken };
