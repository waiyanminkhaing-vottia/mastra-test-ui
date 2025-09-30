import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * Simple health check endpoint
 * Returns 200 OK if the service is running
 * @returns JSON response with basic health information
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'mastra-test-ui',
      version: '1.0.0',
    },
    { status: 200 }
  );
}
