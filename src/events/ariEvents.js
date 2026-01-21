import dgram from 'dgram';
import { connectBot, startBotListener, sendToBot, sendStartEvent, closeBot } from '../bot/botClient.js';

const udpClient = dgram.createSocket('udp4');
const ASTERISK_IP = '192.168.51.53';
const NODE_IP = '192.168.10.13';
const NODE_PORT = 4000;

udpClient.on('error', (err) => console.error(err));
udpClient.bind(NODE_PORT);

const registerAriEvents = async (client) => {
    client.on('StasisStart', async (event, channel) => {
        const channelId = channel.id;
        try {
            if (event.args[0] !== 'outbound') return;

            const clientWsUrl = 'ws://127.0.0.1:8081';
            let seq = Math.floor(Math.random() * 65535);
            let ts = Math.floor(Math.random() * 4294967295) >>> 0;
            const ssrc = Math.floor(Math.random() * 4294967295) >>> 0;

            const getRtpHeader = () => {
                const header = Buffer.alloc(12);
                header[0] = 0x80;
                header[1] = 8;
                header.writeUInt16BE(seq, 2);
                header.writeUInt32BE(ts >>> 0, 4);
                header.writeUInt32BE(ssrc >>> 0, 8);
                seq = (seq + 1) & 0xFFFF;
                ts = (ts + 160) >>> 0;
                return header;
            };

            await connectBot(channelId, clientWsUrl);
            await channel.answer();

            const bridge = await client.bridges.create({ type: 'mixing' });
            const externalChannel = await client.channels.externalMedia({
                app: process.env.ASTERISK_APP_NAME,
                external_host: `${NODE_IP}:${NODE_PORT}`,
                format: 'alaw'
            });

            const targetPort = parseInt(externalChannel.channelvars.UNICASTRTP_LOCAL_PORT);
            await bridge.addChannel({ channel: [channelId, externalChannel.id] });

            // --- HIGH PRECISION LEAKY BUCKET START ---
            let packetQueue = [];
            let rtpTimeout = null;
            const INTERVAL_NS = 20n * 1_000_000n;
            let nextRtpTick = null;

            const sendRtpLoop = () => {
                if (packetQueue.length === 0) {
                    nextRtpTick = null; // Stop loop if queue empty
                    return;
                }

                const pcmChunk = packetQueue.shift();
                const rtpPacket = Buffer.concat([getRtpHeader(), pcmChunk]);
                udpClient.send(rtpPacket, 0, rtpPacket.length, targetPort, ASTERISK_IP);

                if (nextRtpTick === null) nextRtpTick = process.hrtime.bigint();
                nextRtpTick += INTERVAL_NS;

                const now = process.hrtime.bigint();
                const delay = Number(nextRtpTick - now) / 1_000_000;
                rtpTimeout = setTimeout(sendRtpLoop, Math.max(0, delay));
            };

            startBotListener(channelId, (pcmChunk) => {
                packetQueue.push(pcmChunk);
                // Start the loop if it's not already running and we have a small buffer
                if (!rtpTimeout && packetQueue.length >= 3) {
                    sendRtpLoop();
                }
            });
            // --- HIGH PRECISION LEAKY BUCKET END ---

            setTimeout(() => sendStartEvent(channelId), 500);

            channel.on('StasisEnd', async () => {
                try {
                    if (rtpTimeout) clearTimeout(rtpTimeout);
                    closeBot(channelId);
                    await externalChannel.hangup();
                    await bridge.destroy();
                } catch (e) { }
            });
        } catch (err) {
            closeBot(channelId);
            try { await channel.hangup(); } catch (e) { }
        }
    });
};

export default registerAriEvents;