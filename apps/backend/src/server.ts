import app from './app';
import { config, validateConfig } from './config/unifiedConfig';

// Validate configuration
validateConfig();

const PORT = config.server.port;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${config.server.nodeEnv}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
