import express from 'express';
import cors from 'cors';
import callRoutes from './routes/callRoutes.js';

const startServer = () => {
    const app = express();

    app.use(
        cors({
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        })
    );

    app.use(express.json());

    app.use('/api/call', callRoutes);

    app.get('/health', (_, res) => {
        res.json({ status: 'ARI outbound service running' });
    });

    app.listen(process.env.PORT, () => {
        console.log(`🚀 HTTP server running on ${process.env.PORT}`);
    });
};

export default startServer;
