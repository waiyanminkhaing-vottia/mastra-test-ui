import { NextRequest, NextResponse } from 'next/server';

import { ENV_CONFIG, SECURITY_CONFIG } from './config';

/**
 * CORS configuration for API routes
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin':
    ENV_CONFIG.NODE_ENV === 'production' ? ENV_CONFIG.ALLOWED_ORIGINS : '*',
  'Access-Control-Allow-Methods': SECURITY_CONFIG.ALLOWED_METHODS,
  'Access-Control-Allow-Headers': SECURITY_CONFIG.ALLOWED_HEADERS,
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': SECURITY_CONFIG.CORS_MAX_AGE,
};

/**
 * Handles CORS preflight requests
 */
export function handleCORSPreflight(): NextResponse {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

/**
 * Adds CORS headers to a response
 */
export function addCORSHeaders(response: NextResponse): NextResponse {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Creates a JSON response with CORS headers
 */
export function corsJsonResponse(
  data: unknown,
  init?: ResponseInit
): NextResponse {
  const response = NextResponse.json(data, init);
  return addCORSHeaders(response);
}

/**
 * Validates origin against allowed origins
 */
export function isOriginAllowed(request: NextRequest): boolean {
  const origin = request.headers.get('origin');

  if (!origin) {
    // Allow requests without origin (e.g., mobile apps, Postman)
    return true;
  }

  if (ENV_CONFIG.NODE_ENV === 'development') {
    // Allow all origins in development
    return true;
  }

  const allowedOrigins = ENV_CONFIG.ALLOWED_ORIGINS.split(',').map(o =>
    o.trim()
  );
  return allowedOrigins.includes(origin);
}
