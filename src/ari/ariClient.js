import AriClient from 'ari-client';

let ariClient = null;

export const getAriClient = async () => {
    if (ariClient) return ariClient;

    ariClient = await AriClient.connect(
        process.env.ASTERISK_URL,
        process.env.ASTERISK_USER,
        process.env.ASTERISK_PASS
    );

    ariClient.start(process.env.ASTERISK_APP_NAME);
    console.log('✅ ARI connected:', process.env.ASTERISK_APP_NAME);

    return ariClient;
};
