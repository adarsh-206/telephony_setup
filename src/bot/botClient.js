import WebSocket from 'ws';

const sessions = new Map();

export const connectBot = (channelId, wsUrl) => {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl);

        ws.on('open', () => {
            sessions.set(channelId, { ws, callback: null });
            resolve(true);
        });

        ws.on('message', (data) => {
            const session = sessions.get(channelId);
            if (session && session.callback) {
                const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
                session.callback(buffer);
            }
        });

        ws.on('close', () => {
            sessions.delete(channelId);
        });

        ws.on('error', (err) => {
            sessions.delete(channelId);
            reject(err);
        });
    });
};

export const startBotListener = (channelId, callback) => {
    const session = sessions.get(channelId);
    if (session) {
        session.callback = callback;
    }
};

export const sendToBot = (channelId, pcmChunk) => {
    const session = sessions.get(channelId);
    if (session?.ws?.readyState === WebSocket.OPEN) {
        session.ws.send(pcmChunk);
    }
};

export const sendStartEvent = (channelId) => {
    const session = sessions.get(channelId);
    if (session?.ws?.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({ type: 'start' }));
    }
};

export const closeBot = (channelId) => {
    const session = sessions.get(channelId);
    if (session?.ws) {
        session.ws.close();
        sessions.delete(channelId);
    }
};