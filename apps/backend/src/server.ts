import app from './app';
import { config, validateConfig } from './config/unifiedConfig';
import { connectWithRetry, disconnectWithTimeout } from './database/prisma';
import { services } from './services/serviceContainer';

// Validate configuration
validateConfig();

const PORT = config.server.port;

async function startServer(): Promise<void> {
  // Connect to database with retry logic
  await connectWithRetry();

  const server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on port ${PORT}`);
    // eslint-disable-next-line no-console
    console.log(`Environment: ${config.server.nodeEnv}`);
    // eslint-disable-next-line no-console
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });

  // Graceful shutdown with timeout
  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`${signal} received, shutting down gracefully`);

    // Stop accepting new connections
    server.close(() => {
      // eslint-disable-next-line no-console
      console.log('HTTP server closed');
    });

    // Dispose services (engine pool, etc.)
    // eslint-disable-next-line no-console
    console.log('Disposing services...');
    await services.dispose();
    // eslint-disable-next-line no-console
    console.log('Services disposed');

    // Disconnect from database with timeout
    await disconnectWithTimeout(5000);

    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
