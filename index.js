import 'dotenv/config';

import { getAriClient } from './src/ari/ariClient.js';
import registerAriEvents from './src/events/ariEvents.js';
import startServer from './src/server.js';

(async () => {
    try {
        const client = await getAriClient();
        registerAriEvents(client);
        startServer();
    } catch (err) {
        console.error('❌ Startup failed:', err.message);
        process.exit(1);
    }
})();
