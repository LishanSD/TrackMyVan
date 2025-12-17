/**
 * OpenRouteService (ORS) Configuration
 *
 * Manages API key, endpoints, and request settings for ORS API
 */

import Constants from 'expo-constants';

// ============================================================================
// Configuration
// ============================================================================

/**
 * ORS API Configuration
 */
export const ORSConfig = {
  /**
   * API Key - Hardcoded for ORS API access
   * Get your free API key at: https://openrouteservice.org/
   */
  apiKey:
    'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjMzODU1MmU1Yjk5NTRlOGVhYzE2MTdhNDMwMTUzMjk2IiwiaCI6Im11cm11cjY0In0=',

  /**
   * Base URL for ORS API
   */
  baseUrl: 'https://api.openrouteservice.org',

  /**
   * API Endpoints
   */
  endpoints: {
    matrix: '/v2/matrix',
    optimization: '/optimization',
    directions: '/v2/directions',
  },

  /**
   * Default profile for routing
   * Options: 'driving-car', 'driving-hgv', 'cycling-regular', 'foot-walking'
   */
  defaultProfile: 'driving-car' as const,

  /**
   * Rate limiting (free tier limits)
   * Free tier: 2000 requests/day, 40 requests/minute
   */
  rateLimit: {
    requestsPerMinute: 40,
    requestsPerDay: 2000,
  },

  /**
   * Request timeout in milliseconds
   */
  timeout: 30000, // 30 seconds

  /**
   * Retry configuration
   */
  retry: {
    maxAttempts: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 5000, // 5 seconds
    backoffMultiplier: 2,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get full URL for an ORS endpoint
 */
export function getEndpointUrl(
  endpoint: keyof typeof ORSConfig.endpoints,
  profile?: string
): string {
  const baseEndpoint = ORSConfig.endpoints[endpoint];

  if (endpoint === 'matrix' || endpoint === 'directions') {
    const routingProfile = profile || ORSConfig.defaultProfile;
    return `${ORSConfig.baseUrl}${baseEndpoint}/${routingProfile}`;
  }

  return `${ORSConfig.baseUrl}${baseEndpoint}`;
}

/**
 * Get headers for ORS API requests
 */
export function getRequestHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (ORSConfig.apiKey) {
    headers['Authorization'] = ORSConfig.apiKey;
  }

  return headers;
}

/**
 * Check if API key is configured
 */
export function isApiKeyConfigured(): boolean {
  return ORSConfig.apiKey !== '';
}

/**
 * Validate API key format (basic check)
 */
export function validateApiKey(apiKey: string): boolean {
  // ORS API keys are typically 32 characters (this is a basic check)
  return apiKey.length >= 32;
}

// ============================================================================
// Rate Limiting
// ============================================================================

interface RequestTimestamp {
  timestamp: number;
}

class RateLimiter {
  private requests: RequestTimestamp[] = [];

  /**
   * Check if we can make a request without exceeding rate limits
   */
  canMakeRequest(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    // Remove requests older than 1 minute
    this.requests = this.requests.filter((req) => req.timestamp > oneMinuteAgo);

    // Check if we're within the requests per minute limit
    return this.requests.length < ORSConfig.rateLimit.requestsPerMinute;
  }

  /**
   * Record a request
   */
  recordRequest(): void {
    this.requests.push({ timestamp: Date.now() });
  }

  /**
   * Get time until next available request slot (in milliseconds)
   */
  getWaitTime(): number {
    if (this.canMakeRequest()) {
      return 0;
    }

    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oldestRequest = this.requests.find((req) => req.timestamp > oneMinuteAgo);

    if (!oldestRequest) {
      return 0;
    }

    const waitTime = oldestRequest.timestamp + 60 * 1000 - now;
    return Math.max(0, waitTime);
  }

  /**
   * Reset rate limiter (useful for testing)
   */
  reset(): void {
    this.requests = [];
  }
}

export const rateLimiter = new RateLimiter();

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Parse ORS API error response
 */
export function parseORSError(error: any): string {
  if (error.response) {
    // HTTP error response
    const status = error.response.status;
    const data = error.response.data;

    if (status === 401 || status === 403) {
      return 'Invalid or missing API key. Please check your ORS API configuration.';
    }

    if (status === 429) {
      return 'Rate limit exceeded. Please try again later.';
    }

    if (status === 500) {
      return 'ORS server error. Please try again later.';
    }

    if (data?.error) {
      return `ORS API Error: ${data.error}`;
    }

    return `HTTP ${status}: ${error.message}`;
  }

  if (error.request) {
    // Request made but no response
    return 'Network error: Unable to reach ORS API. Please check your internet connection.';
  }

  // Something else happened
  return error.message || 'Unknown error occurred';
}

/**
 * Sleep utility for retry delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate retry delay with exponential backoff
 */
export function getRetryDelay(attemptNumber: number): number {
  const { initialDelay, maxDelay, backoffMultiplier } = ORSConfig.retry;
  const delay = initialDelay * Math.pow(backoffMultiplier, attemptNumber - 1);
  return Math.min(delay, maxDelay);
}
