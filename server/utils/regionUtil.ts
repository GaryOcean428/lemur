/**
 * Region utilities for Lemur search engine
 * 
 * This module provides utilities for working with region codes and
 * ensuring consistent application of regional preferences.
 */

/**
 * Normalizes region code to ensure consistent format
 * 
 * @param regionCode The region code to normalize
 * @returns Normalized region code in uppercase or null if invalid
 */
export function normalizeRegionCode(regionCode: string | null | undefined): string | null {
  if (!regionCode) return null;
  
  // Convert to uppercase and trim
  const normalized = regionCode.trim().toUpperCase();
  
  // Validate region code
  if (!isValidRegionCode(normalized)) {
    console.warn(`Invalid region code: ${regionCode}, using default`);
    return null;
  }
  
  return normalized;
}

/**
 * Checks if a region code is valid
 * 
 * @param regionCode The region code to validate
 * @returns Whether the region code is valid
 */
export function isValidRegionCode(regionCode: string): boolean {
  // List of supported region codes for search
  const validRegionCodes = [
    'US', 'EU', 'ASIA', 'AU', 'UK', 'CA', 'GLOBAL'
  ];
  
  return validRegionCodes.includes(regionCode);
}

/**
 * Maps user-friendly region names to ISO region codes
 * 
 * @param region The user-friendly region name
 * @returns ISO region code
 */
export function mapRegionToCode(region: string): string {
  const regionMap: Record<string, string> = {
    'us': 'US',
    'usa': 'US',
    'america': 'US',
    'united states': 'US',
    'eu': 'EU',
    'europe': 'EU',
    'au': 'AU',
    'aus': 'AU',
    'australia': 'AU',
    'asia': 'ASIA',
    'uk': 'GB',
    'united kingdom': 'GB',
    'ca': 'CA',
    'canada': 'CA',
    'global': 'GLOBAL',
    'worldwide': 'GLOBAL'
  };
  
  const normalizedRegion = region.trim().toLowerCase();
  return regionMap[normalizedRegion] || region.toUpperCase();
}

/**
 * Apply region preference to search filters with strong enforcement
 * 
 * @param filters Search filters object
 * @param userRegion User's preferred region
 * @returns Updated filters with enforced region preference
 */
export function enforceRegionPreference(filters: Record<string, any>, userRegion: string | null | undefined): Record<string, any> {
  // Don't modify if user has no region preference or chose global
  if (!userRegion || userRegion.toLowerCase() === 'global') {
    return filters;
  }
  
  // Get normalized region code
  const regionCode = normalizeRegionCode(userRegion);
  if (!regionCode) return filters;
  
  // Create a new filters object to avoid mutating the original
  const updatedFilters = { ...filters };
  
  // Force region to user preference
  updatedFilters.geo_location = regionCode;
  
  // Log the enforcement
  console.log(`Enforced region preference: ${regionCode} for search`);
  
  return updatedFilters;
}