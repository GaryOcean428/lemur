/**
 * Region code utilities
 * 
 * This module provides utility functions for working with region/country codes
 * to ensure consistent formatting and handling across the application
 */

/**
 * Format a region code to ensure it's uppercase and valid
 * @param regionCode The region code to format (e.g., "au", "AU", "Australia")
 * @returns Formatted region code (e.g., "AU") or null if invalid
 */
export function formatRegionCode(regionCode: string | null | undefined): string | null {
  if (!regionCode) return null;
  
  // Trim whitespace and convert to uppercase
  const code = regionCode.trim().toUpperCase();
  
  // Handle common region name to code conversions
  const regionNameMap: Record<string, string> = {
    'AUSTRALIA': 'AU',
    'UNITED STATES': 'US',
    'USA': 'US',
    'UNITED KINGDOM': 'GB',
    'UK': 'GB',
    'CANADA': 'CA',
    'NEW ZEALAND': 'NZ',
    'GERMANY': 'DE',
    'FRANCE': 'FR',
    'JAPAN': 'JP',
    'CHINA': 'CN',
    'INDIA': 'IN',
    'BRAZIL': 'BR',
    'RUSSIA': 'RU'
  };
  
  // If the code is a known region name, convert it to the proper code
  if (regionNameMap[code]) {
    return regionNameMap[code];
  }
  
  // If code is already in ISO 3166-1 alpha-2 format (2 letter code)
  if (/^[A-Z]{2}$/.test(code)) {
    return code;
  }
  
  // Log unknown or invalid region codes
  console.warn(`Unknown or invalid region code: ${regionCode}`);
  
  // Return null for invalid codes
  return null;
}

/**
 * Ensure region code is properly formatted for API requests
 * Returns uppercase 2-letter country code or null
 */
export function normalizeRegionForSearch(regionCode: string | null | undefined): string | null {
  return formatRegionCode(regionCode);
}

/**
 * Get the default region code when none is specified
 * This allows for app-wide defaults to be changed in one place
 */
export function getDefaultRegion(): string | null {
  return process.env.DEFAULT_REGION || null;
}

/**
 * Apply region preferences to search filters
 * Handles formatting and defaults for geo_location
 */
export function applyRegionToFilters(
  filters: Record<string, any>,
  userRegionPreference: string | null | undefined
): Record<string, any> {
  // Make a copy of filters to avoid modifying the original
  const updatedFilters = { ...filters };
  
  // If filters already specify a geo_location, format it properly
  if (updatedFilters.geo_location) {
    const formattedRegion = formatRegionCode(updatedFilters.geo_location);
    if (formattedRegion) {
      updatedFilters.geo_location = formattedRegion;
      console.log(`Using filter-specified region: ${formattedRegion}`);
      return updatedFilters;
    }
  }
  
  // If no region in filters but user has a preference, use that
  if (userRegionPreference) {
    const formattedRegion = formatRegionCode(userRegionPreference);
    if (formattedRegion) {
      updatedFilters.geo_location = formattedRegion;
      console.log(`Using user preference region: ${formattedRegion}`);
      return updatedFilters;
    }
  }
  
  // Fallback to default region if available
  const defaultRegion = getDefaultRegion();
  if (defaultRegion) {
    updatedFilters.geo_location = defaultRegion;
    console.log(`Using default region: ${defaultRegion}`);
  } else {
    // If no region specified anywhere, explicitly set to null to ensure consistency
    updatedFilters.geo_location = null;
    console.log('No region specified for search');
  }
  
  return updatedFilters;
}