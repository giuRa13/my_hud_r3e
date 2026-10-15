import { SharedMemory, MemoryAccess } from 'node-shared-mem';
import { WebSocketServer } from 'ws';

const PORT = 8070;
const SHM_NAME = "$R3E"; 
const SHM_SIZE = 65536; // verifica sizeof(r3e_shared) nella tua versione dell'SDK

const wss = new WebSocketServer({ port: PORT });
console.log("Bridge R3E WebSocket active on port: ", PORT);

let r3e_memory = null;

function read_telemetry() {
    try {
        if(!r3e_memory) {
            // read-only mode connection
            r3e_memory = new SharedMemory(SHM_NAME, SHM_SIZE, MemoryAccess.READ);
            console.log("✅Success connect to R3E Shared Memory");
        }

        // if Node V8 memory cage requires explicit sync
        if(r3e_memory.requiresCopy) r3e_memory.copyFrom();

        //node-shared-mem expone an ArrayBuffer. wrap it in a Node.js Buffer for binary offsets
        const buffer = Buffer.from(r3e_memory.buffer);

        // data extraction (data based on struct r3e_shared)
        const telemetry = {
            version: buffer.readInt32LE(0),
            gear: buffer.readInt32LE(132),          // -1 = R, 0 = N, 1 = 1a...
            engineRpm: buffer.readFloatLE(136),     
            maxEngineRpm: buffer.readFloatLE(140),  
            speed: buffer.readFloatLE(144) * 3.6,   // da m/s a km/h
            
            lapTimeCurrent: buffer.readFloatLE(200),
            timeDelta: buffer.readFloatLE(220)
        };

        return telemetry;
    }
    catch (error) {
        // RaceRoom closed or not on track
        r3e_memory = null; // retry on next read
        return null;
    }
};

// global loop, broadcast to all clients
setInterval(() => {
    if (wss.clients.size === 0) return;

    const data = readTelemetry();
    if (!data) return;
    const payload = JSON.stringify(data);

    for (const client of wss.clients) {
        if (client.readyState === client.OPEN) client.send(payload);
    }
}, 16); // ~60Hz

wss.on("connection", (ws) => {
    console.log("🔌 WebHUD Client connected");

    ws.on("close", () => {
        console.log("❌ WebHUD Client disconnected");
    });
});