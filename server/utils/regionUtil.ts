/**
 * Region utilities for Lemur search engine
 * 
 * This module provides utilities for working with region codes and
 * ensuring consistent application of regional preferences across all search methods.
 * Includes functions for region validation, normalization, code mapping, and
 * generating region-specific instructions for AI models.
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
    'US', 'EU', 'ASIA', 'AU', 'UK', 'GB', 'CA', 'GLOBAL',
    'NZ', 'IN', 'DE', 'FR', 'JP', 'BR', // Additional supported regions
    'LATAM', 'AFRICA', 'OCEANIA', 'ME', 'MX', 'ES', 'IT', 'CN', 'KR' // Expanded regional support
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
    // North America
    'us': 'US',
    'usa': 'US',
    'america': 'US',
    'united states': 'US',
    'ca': 'CA',
    'canada': 'CA',
    'mx': 'MX',
    'mexico': 'MX',
    
    // Europe
    'eu': 'EU',
    'europe': 'EU',
    'uk': 'GB',
    'united kingdom': 'GB',
    'great britain': 'GB',
    'de': 'DE',
    'germany': 'DE',
    'deutschland': 'DE',
    'fr': 'FR',
    'france': 'FR',
    'es': 'ES',
    'spain': 'ES',
    'españa': 'ES',
    'it': 'IT',
    'italy': 'IT',
    'italia': 'IT',
    
    // Asia-Pacific
    'asia': 'ASIA',
    'au': 'AU',
    'aus': 'AU',
    'australia': 'AU',
    'nz': 'NZ',
    'new zealand': 'NZ',
    'jp': 'JP',
    'japan': 'JP',
    'in': 'IN',
    'india': 'IN',
    'cn': 'CN',
    'china': 'CN',
    'kr': 'KR',
    'korea': 'KR',
    'south korea': 'KR',
    
    // Latin America
    'latam': 'LATAM',
    'latin america': 'LATAM',
    'br': 'BR',
    'brazil': 'BR',
    'brasil': 'BR',
    
    // Other Regions
    'africa': 'AFRICA',
    'oceania': 'OCEANIA',
    'me': 'ME',
    'middle east': 'ME',
    
    // Global
    'global': 'GLOBAL',
    'worldwide': 'GLOBAL',
    'international': 'GLOBAL'
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

/**
 * Generates region-specific instructions for the AI model based on region code
 * Used to customize the AI system prompt for providing regionally relevant results
 * 
 * @param regionCode ISO country code (2-letter)
 * @returns Detailed instruction text for regional relevance
 */
export function getRegionalInstructionForCode(regionCode: string): string {
  // Common instruction pattern for all regions
  const defaultInstruction = `The user is in the ${regionCode} region. Prioritize content, services, and context relevant to this region.`;
  
  // Handle specific regions with tailored instructions
  switch (regionCode) {
    // North America
    case 'US':
      return 'The user is in the UNITED STATES. Prioritize American content, services, prices in USD, and ensure results are relevant to US contexts. Mention when information is specific to the US.';
    case 'CA':
      return 'The user is in CANADA. Prioritize Canadian content, services, prices in CAD, and ensure results are relevant to Canadian contexts. Mention when information is specific to Canada.';
    case 'MX':
      return 'The user is in MEXICO. Prioritize Mexican content, services, prices in MXN, and ensure results are relevant to Mexican contexts. Mention when information is specific to Mexico.';
    
    // Europe
    case 'GB':
    case 'UK':
      return 'The user is in the UNITED KINGDOM. Prioritize British content, services, prices in GBP, and ensure results are relevant to UK contexts. Mention when information is specific to the UK.';
    case 'DE':
      return 'The user is in GERMANY. Prioritize German content, services, prices in EUR, and ensure results are relevant to German contexts. Mention when information is specific to Germany.';
    case 'FR':
      return 'The user is in FRANCE. Prioritize French content, services, prices in EUR, and ensure results are relevant to French contexts. Mention when information is specific to France.';
    case 'ES':
      return 'The user is in SPAIN. Prioritize Spanish content, services, prices in EUR, and ensure results are relevant to Spanish contexts. Mention when information is specific to Spain.';
    case 'IT':
      return 'The user is in ITALY. Prioritize Italian content, services, prices in EUR, and ensure results are relevant to Italian contexts. Mention when information is specific to Italy.';
    case 'EU':
      return 'The user is in EUROPE. Prioritize European content, services, prices in EUR, and ensure results are relevant to European contexts. Mention when information is specific to Europe.';
    
    // Asia-Pacific
    case 'AU':
      return 'The user is in AUSTRALIA. Always prioritize Australian content, services, prices in AUD, and local context. Mention specifically when results are from Australia.';
    case 'NZ':
      return 'The user is in NEW ZEALAND. Prioritize New Zealand content, services, prices in NZD, and ensure results are relevant to NZ contexts. Mention when information is specific to New Zealand.';
    case 'JP':
      return 'The user is in JAPAN. Prioritize Japanese content, services, prices in JPY, and ensure results are relevant to Japanese contexts. Mention when information is specific to Japan.';
    case 'IN':
      return 'The user is in INDIA. Prioritize Indian content, services, prices in INR, and ensure results are relevant to Indian contexts. Mention when information is specific to India.';
    case 'CN':
      return 'The user is in CHINA. Prioritize Chinese content, services, prices in CNY, and ensure results are relevant to Chinese contexts. Mention when information is specific to China.';
    case 'KR':
      return 'The user is in SOUTH KOREA. Prioritize Korean content, services, prices in KRW, and ensure results are relevant to Korean contexts. Mention when information is specific to South Korea.';
    case 'ASIA':
      return 'The user is in ASIA. Prioritize Asian content, services, and ensure results are relevant to Asian contexts. Consider regional differences across Asian countries.';
    
    // Latin America
    case 'BR':
      return 'The user is in BRAZIL. Prioritize Brazilian content, services, prices in BRL, and ensure results are relevant to Brazilian contexts. Mention when information is specific to Brazil.';
    case 'LATAM':
      return 'The user is in LATIN AMERICA. Prioritize Latin American content, services, and ensure results are relevant to Latin American contexts. Consider regional differences across Latin American countries.';
    
    // Other Regions
    case 'AFRICA':
      return 'The user is in AFRICA. Prioritize African content, services, and ensure results are relevant to African contexts. Consider regional differences across African countries.';
    case 'OCEANIA':
      return 'The user is in OCEANIA. Prioritize Oceanian content, services, and ensure results are relevant to Oceanian contexts, particularly focusing on Pacific Island nations beyond Australia and New Zealand.';
    case 'ME':
      return 'The user is in the MIDDLE EAST. Prioritize Middle Eastern content, services, and ensure results are relevant to Middle Eastern contexts. Consider regional differences across Middle Eastern countries.';
    
    // Global
    case 'GLOBAL':
      return 'The user has selected GLOBAL scope. Provide a balanced international perspective without regional bias. Present information that is globally applicable.';
    
    default:
      return defaultInstruction;
  }
}