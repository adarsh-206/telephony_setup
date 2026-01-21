import WebSocket, { WebSocketServer } from 'ws';
import fs from 'fs';

const PORT = 8081;
const PACKET_SIZE = 160;
const INTERVAL_MS = 20;
const AUDIO_FILES = [
    './sounds/voice_1.alaw',
    './sounds/voice_2.alaw',
    './sounds/voice_3.alaw'
];

const loadedAudios = [];
try {
    for (const path of AUDIO_FILES) {
        loadedAudios.push(fs.readFileSync(path));
    }
} catch (err) {
    process.exit(1);
}

const wss = new WebSocketServer({ port: PORT, host: '127.0.0.1' });

wss.on('connection', (ws) => {
    let audioTimeout = null;

    ws.on('message', (msg) => {
        try {
            const message = JSON.parse(msg.toString());
            if (message.type === 'start') {
                const audio = loadedAudios[Math.floor(Math.random() * loadedAudios.length)];
                let offset = 0;

                if (audioTimeout) clearTimeout(audioTimeout);

                for (let i = 0; i < 3; i++) {
                    if (offset < audio.length) {
                        ws.send(audio.subarray(offset, offset + PACKET_SIZE));
                        offset += PACKET_SIZE;
                    }
                }

                const intervalNS = BigInt(INTERVAL_MS) * 1_000_000n;
                let nextTick = process.hrtime.bigint();

                const stream = () => {
                    if (ws.readyState !== WebSocket.OPEN) return;

                    if (offset >= audio.length) offset = 0;

                    const chunk = audio.subarray(offset, offset + PACKET_SIZE);
                    ws.send(chunk);
                    offset += PACKET_SIZE;

                    nextTick += intervalNS;

                    const now = process.hrtime.bigint();
                    const delayMS = Number(nextTick - now) / 1_000_000;

                    audioTimeout = setTimeout(stream, Math.max(0, delayMS));
                };

                stream();
            }
        } catch (e) { }
    });

    ws.on('close', () => {
        if (audioTimeout) clearTimeout(audioTimeout);
    });

    ws.on('error', () => {
        if (audioTimeout) clearTimeout(audioTimeout);
    });
});

console.log(`[READY] Bot Server running on 127.0.0.1:${PORT}`);