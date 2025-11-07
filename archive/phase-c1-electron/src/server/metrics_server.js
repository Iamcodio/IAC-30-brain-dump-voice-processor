/**
 * MetricsServer - HTTP server for Prometheus metrics scraping
 *
 * Provides an HTTP endpoint for Prometheus to scrape metrics.
 * Exposes metrics at /metrics in Prometheus text format.
 * Also provides a /health endpoint for health checks.
 *
 * @module server/MetricsServer
 */

const http = require('http');
const config = require('config');
const logger = require('../utils/logger');
const { register } = require('../utils/metrics');

/**
 * MetricsServer class - HTTP server for exposing Prometheus metrics
 */
class MetricsServer {
  /**
   * Creates a new MetricsServer instance
   */
  constructor() {
    this.server = null;
  }

  /**
   * Start the metrics HTTP server
   *
   * Creates an HTTP server that responds to:
   * - GET /metrics - Prometheus metrics in text format
   * - GET /health - Health check endpoint
   *
   * Server listens on localhost only for security.
   * If metrics are disabled in config, this method does nothing.
   */
  start() {
    if (!config.get('metrics.enabled')) {
      logger.info('Metrics collection disabled');
      return;
    }

    const port = config.get('metrics.port');

    this.server = http.createServer(async (req, res) => {
      try {
        if (req.url === '/metrics' && req.method === 'GET') {
          // Prometheus metrics endpoint
          res.setHeader('Content-Type', register.contentType);
          res.statusCode = 200;
          res.end(await register.metrics());
        } else if (req.url === '/health' && req.method === 'GET') {
          // Health check endpoint
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString()
          }));
        } else {
          // 404 for all other routes
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain');
          res.end('Not Found');
        }
      } catch (error) {
        logger.error('Metrics server error', { error: error.message });
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Internal Server Error');
      }
    });

    this.server.listen(port, 'localhost', () => {
      logger.info('Metrics server started', { port, url: `http://localhost:${port}/metrics` });
    });

    // Handle server errors
    this.server.on('error', (error) => {
      logger.error('Metrics server error', { error: error.message });
    });
  }

  /**
   * Stop the metrics HTTP server
   *
   * Gracefully closes the HTTP server and releases the port.
   */
  stop() {
    if (this.server) {
      this.server.close(() => {
        logger.info('Metrics server stopped');
      });
      this.server = null;
    }
  }
}

module.exports = MetricsServer;
