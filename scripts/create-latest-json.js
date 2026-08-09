import fs from "node:fs";

const version = process.env.VERSION;
const host = process.env.HETZNER_HOST;
const installerName = process.env.INSTALLER_NAME;
const signaturePath = process.env.SIGNATURE_PATH;

const signature = fs.readFileSync(signaturePath, "utf8").trim();

const pubDate = new Date().toISOString();

const downloadURL =
  `http://${host}/updater/${version}/${installerName}`;

const daten = {
  version: version,
  pub_date: pubDate,
  platforms: {
    "windows-x86_64": {
      url: downloadURL,
      signature: signature
    }
  }
};

const json = JSON.stringify(daten, null, 2);

fs.writeFileSync("latest.json", json, "utf8");