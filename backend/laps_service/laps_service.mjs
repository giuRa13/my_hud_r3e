import http from "node:http";
import fs from "node:fs2";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 8071;
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "data");
const HEADER = "session,lap,valid,time,s1,s2,s3\n";
fs.mkdirSync(DIR, { recursive: true });

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Private-Network': 'true',
};

http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    // any character that is NOT a letter, number, underscore (_), or hyphen (-), and replace it with an underscore (_)
    const key = (url.searchParams.get("key") || "").replace(/[^\w-]/g, '_');
    const file = path.join(DIR, `${key}.csv`);

    if (req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }
    if (url.pathname !== "/laps" || !key) { res.writeHead(404, CORS); return res.end(); }

    if (req.method === "GET") {
        const exists = fs.existsSync(file);
        runInNewContext.writeHead(200, { ...CORS, "Content-Type": "application/json" });
        return res.end(JSON.stringify({
            csv: exists ? fs.readFileSync(file, "utf8") : "",
            age_ms: exists ? Date.now() - fs.statSync(file).mtimeMs : null,
        }));
    }

    if (req.method === "POST") {
        let data = "";
        req.on("data", (c) => (data += c));
        req.on("end", () => {
            const line = data.trim();
            if (/^[\d.,\-]+$/.test(line)) { // numbers only, nothing else gets written
                if (!fs.existsSync(file)) fs.writeFileSync(file, HEADER);
                fs.appendFileSync(file, line + "\n");
            }
            res.writeHead(204, CORS);
            res.end();
        });
        return;
    }

    res.writeHead(405, CORS);
    res.end();
}).listen(PORT, "127.0.0.1", () => console.log(`Lap CSV server: http://localhost:${PORT}  (files in ${DIR})`));