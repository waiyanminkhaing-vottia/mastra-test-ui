import { NextResponse } from 'next/server';

import { corsJsonResponse, handleCORSPreflight } from '@/lib/cors';
import { logger } from '@/lib/logger';
import { mastraClient } from '@/lib/mastra-client';

/**
 * Handles OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return handleCORSPreflight();
}

/**
 * Health check endpoint that returns application status information
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // Basic health data
    const healthData: Record<string, unknown> = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || '3000',
      version: process.env.npm_package_version || '1.0.0',
    };

    // Check Mastra connectivity
    let mastraStatus = 'unknown';
    try {
      // Try to get agents list as a connectivity test
      await Promise.race([
        mastraClient.getAgents(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Mastra timeout')), 5000)
        ),
      ]);
      mastraStatus = 'connected';
    } catch (error) {
      mastraStatus = 'disconnected';
      healthData.mastraError =
        error instanceof Error ? error.message : 'Connection failed';
      logger.warn({ error }, 'Mastra connectivity check failed');
    }

    healthData.services = {
      mastra: mastraStatus,
    };

    healthData.responseTime = `${Date.now() - startTime}ms`;

    const isHealthy = mastraStatus === 'connected';
    const statusCode = isHealthy ? 200 : 503;

    if (!isHealthy) {
      healthData.status = 'degraded';
    }

    return corsJsonResponse(healthData, { status: statusCode });
  } catch (error) {
    logger.error({ error }, 'Health check error');

    return corsJsonResponse(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: `${Date.now() - startTime}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

/**
 * Health check HEAD endpoint for quick status checks
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
