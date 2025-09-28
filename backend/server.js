const app = require('./app');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Graceful shutdown handling
let server;

const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  if (server) {
    server.close((err) => {
      if (err) {
        console.error('Error during server close:', err);
        process.exit(1);
      }
      console.log('HTTP server closed.');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Start server
function startServer() {
  console.log('🚀 Starting server...');

  server = app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    console.log(`📝 Environment: ${NODE_ENV}`);
    console.log(`🕐 Started at: ${new Date().toISOString()}`);
    console.log(`ℹ️  Database will be initialized on first API request`);
    console.log(`✅ Server is ready and healthy`);
    console.log(`🔗 Health endpoints: /health, /healthz, /ping, /api/health`);
    console.log(`🎯 READY - Server successfully started and listening`);

    if (NODE_ENV === 'development') {
      console.log(`📊 Health check: http://${HOST}:${PORT}/api/health`);
    }

    // Send explicit ready signal for deployment platforms
    if (process.send) {
      process.send('ready');
    }
  });

  // Handle server errors
  server.on('error', handleServerError);
}

function handleServerError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
}

// Start the server
startServer();

// Handle process termination
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

module.exports = server;