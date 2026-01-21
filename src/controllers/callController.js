import { getAriClient } from '../ari/ariClient.js';

export const makeOutboundCall = async (req, res) => {
    try {
        const { To } = req.body;

        if (!To) {
            return res.status(400).json({
                error: 'To is required'
            });
        }

        const client = await getAriClient();

        const channel = await client.channels.originate({
            endpoint: `SIP/${To}@voicebot`,
            app: process.env.ASTERISK_APP_NAME,
            appArgs: 'outbound',
            callerId: To,
            timeout: 30
        });

        return res.status(200).json({
            message: 'Outbound call initiated',
            channelId: channel.id
        });
    } catch (error) {
        console.error(error.message);

        return res.status(500).json({
            error: 'Failed to initiate outbound call'
        });
    }
};
