// Simple in-memory caching middleware for API responses

const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const cacheMiddleware = (duration = CACHE_DURATION) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Create cache key from URL and user ID (for user-specific data)
    const userId = req.user ? req.user.id : 'anonymous';
    const cacheKey = `${req.originalUrl}_${userId}`;

    // Check if we have cached response
    const cachedResponse = cache.get(cacheKey);

    if (cachedResponse && Date.now() - cachedResponse.timestamp < duration) {
      console.log(`Cache HIT for ${cacheKey}`);
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Age', Math.floor((Date.now() - cachedResponse.timestamp) / 1000));
      return res.json(cachedResponse.data);
    }

    // Cache miss - capture response
    const originalJson = res.json;
    res.json = function(data) {
      // Cache successful responses only
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, {
          data: data,
          timestamp: Date.now()
        });
        console.log(`Cache SET for ${cacheKey}`);
        res.setHeader('X-Cache', 'MISS');
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

// Cache invalidation functions
const invalidateCache = (pattern) => {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
      console.log(`Cache INVALIDATE: ${key}`);
    }
  }
};

const invalidateUserCache = (userId) => {
  invalidateCache(`_${userId}`);
};

const clearCache = () => {
  cache.clear();
  console.log('Cache CLEARED');
};

// Periodic cache cleanup
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  let deletedCount = 0;

  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      cache.delete(key);
      deletedCount++;
    }
  }

  if (deletedCount > 0) {
    console.log(`Cache cleanup: removed ${deletedCount} expired entries`);
  }
}, CACHE_DURATION);

// Graceful cleanup on exit
process.on('SIGINT', () => {
  clearInterval(cleanupInterval);
  clearCache();
});

module.exports = {
  cacheMiddleware,
  invalidateCache,
  invalidateUserCache,
  clearCache
};