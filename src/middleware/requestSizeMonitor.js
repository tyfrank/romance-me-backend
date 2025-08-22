/**
 * Request Size Monitoring Middleware
 * Prevents oversized requests that could cause context window errors
 */

const DEFAULT_CONFIG = {
  maxRequestSize: 100 * 1024, // 100KB
  maxResponseSize: 500 * 1024, // 500KB
  logOversizedRequests: true,
  blockOversizedRequests: true,
};

class RequestSizeMonitor {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Middleware to monitor request size
  monitorRequest() {
    return (req, res, next) => {
      const requestSize = this.calculateRequestSize(req);

      if (requestSize > this.config.maxRequestSize) {
        if (this.config.logOversizedRequests) {
          console.warn(`Oversized request detected:`, {
            url: req.url,
            method: req.method,
            size: requestSize,
            maxAllowed: this.config.maxRequestSize,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString(),
          });
        }

        if (this.config.blockOversizedRequests) {
          return res.status(413).json({
            error: 'Request size too large',
            message: 'Request exceeds maximum allowed size',
            maxSize: this.config.maxRequestSize,
            actualSize: requestSize,
          });
        }
      }

      // Monitor response size
      const originalSend = res.send;
      res.send = function(data) {
        const responseSize = Buffer.byteLength(JSON.stringify(data), 'utf8');
        
        if (responseSize > DEFAULT_CONFIG.maxResponseSize) {
          console.warn(`Oversized response detected:`, {
            url: req.url,
            method: req.method,
            responseSize,
            maxAllowed: DEFAULT_CONFIG.maxResponseSize,
            timestamp: new Date().toISOString(),
          });
        }

        return originalSend.call(this, data);
      };

      next();
    };
  }

  // Calculate request size
  calculateRequestSize(req) {
    let size = 0;

    // Headers size
    size += JSON.stringify(req.headers).length;

    // URL size
    size += req.url.length;

    // Body size
    if (req.body) {
      size += Buffer.byteLength(JSON.stringify(req.body), 'utf8');
    }

    // Query parameters size
    if (req.query) {
      size += JSON.stringify(req.query).length;
    }

    return size;
  }

  // Get request size analytics
  static getRequestSizeAnalytics(req) {
    const headers = JSON.stringify(req.headers);
    const body = req.body ? JSON.stringify(req.body) : '';
    const query = JSON.stringify(req.query || {});
    
    return {
      url: req.url,
      method: req.method,
      headers: {
        size: headers.length,
        count: Object.keys(req.headers).length,
      },
      body: {
        size: body.length,
        hasBody: !!req.body,
      },
      query: {
        size: query.length,
        count: Object.keys(req.query || {}).length,
      },
      total: headers.length + body.length + query.length + req.url.length,
      timestamp: new Date().toISOString(),
    };
  }
}

// Payment-specific size monitoring
const paymentRequestSizeMonitor = new RequestSizeMonitor({
  maxRequestSize: 50 * 1024, // 50KB for payment requests
  maxResponseSize: 100 * 1024, // 100KB for payment responses
  logOversizedRequests: true,
  blockOversizedRequests: true,
});

// Content loading size monitoring (more restrictive)
const contentRequestSizeMonitor = new RequestSizeMonitor({
  maxRequestSize: 200 * 1024, // 200KB for content requests
  maxResponseSize: 1024 * 1024, // 1MB for content responses
  logOversizedRequests: true,
  blockOversizedRequests: false, // Allow but log
});

module.exports = {
  RequestSizeMonitor,
  paymentRequestSizeMonitor,
  contentRequestSizeMonitor,
};