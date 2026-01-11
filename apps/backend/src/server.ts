import app from './app';
import { config, validateConfig } from './config/unifiedConfig';
import { connectWithRetry, disconnectWithTimeout } from './database/prisma';

// Validate configuration
validateConfig();

const PORT = config.server.port;

async function startServer(): Promise<void> {
  // Connect to database with retry logic
  await connectWithRetry();

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${config.server.nodeEnv}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });

  // Graceful shutdown with timeout
  const shutdown = async (signal: string) => {
    console.log(`${signal} received, shutting down gracefully`);

    // Stop accepting new connections
    server.close(() => {
      console.log('HTTP server closed');
    });

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
