const fs = require("fs");   

const version = process.env.VERSION; 
console.log(`Version: ${version}`);

const Host = process.env.HETZNER_HOST;

const signaturPath = "src-tauri/target/release/bundle/macos/updater.app.tar.gz.sig"

const signature = fs.readFileSync(signaturPath, "utf-8").trim();

const pubDate = new Date().toISOString();

const downloadURL = `http://${host}/updater/${version}/updater.app.tar.gz`;


const daten = {
    version: version,
    pubdate: pubDate,
    platforms: {
        "darwin-aarch64": {
            url: downloadURL,
            signature: signature
        }
    }
}

const json = JSON.stringify(daten, null, 2);    

fs.writeFileSync("latest.json", json, "utf-8");