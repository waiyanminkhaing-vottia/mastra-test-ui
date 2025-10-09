import { ENV_CONFIG } from './config';

/**
 * Get tenant-specific asset path
 * If tenantId is not set, returns default asset path
 * Otherwise returns tenant-specific asset path with tenant suffix
 */
export function getTenantAsset(assetType: 'brand' | 'favicon'): string {
  const tenantId = ENV_CONFIG.TENANT_ID;

  if (!tenantId) {
    // Default assets when no tenant is specified
    return assetType === 'brand' ? '/brand.png' : '/favicon.svg';
  }

  // Tenant-specific assets
  if (assetType === 'brand') {
    return `/brand-${tenantId}.png`;
  } else {
    return `/favicon-${tenantId}.svg`;
  }
}

/**
 * Get brand image path for current tenant
 */
export function getBrandImage(): string {
  return getTenantAsset('brand');
}

/**
 * Get favicon path for current tenant
 */
export function getFavicon(): string {
  return getTenantAsset('favicon');
}
