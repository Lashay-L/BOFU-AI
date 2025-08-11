// Environment Variable Validation Utility
// Centralized validation for all required environment variables

interface EnvironmentConfig {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_GEMINI_API_KEY?: string; // Optional for features that use Gemini
}

interface ValidationResult {
  isValid: boolean;
  missingVariables: string[];
  warnings: string[];
}

/**
 * Validates that all required environment variables are present
 * @param requiredVars - Array of required environment variable names
 * @param optionalVars - Array of optional environment variable names
 * @returns ValidationResult object
 */
export function validateEnvironmentVariables(
  requiredVars: string[] = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
  optionalVars: string[] = ['VITE_GEMINI_API_KEY', 'VITE_SENTRY_DSN']
): ValidationResult {
  const missingVariables: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  requiredVars.forEach(varName => {
    const value = import.meta.env[varName];
    if (!value || value.trim() === '') {
      missingVariables.push(varName);
    }
  });

  // Check optional variables and warn if missing
  optionalVars.forEach(varName => {
    const value = import.meta.env[varName];
    if (!value || value.trim() === '') {
      warnings.push(`Optional environment variable ${varName} is not set. Some features may be unavailable.`);
    }
  });

  return {
    isValid: missingVariables.length === 0,
    missingVariables,
    warnings
  };
}

/**
 * Validates environment on app startup and logs results
 * Throws error if required variables are missing
 */
export function validateAndLogEnvironment(): void {
  const validation = validateEnvironmentVariables();

  if (!validation.isValid) {
    const errorMessage = `Missing required environment variables: ${validation.missingVariables.join(', ')}. Please check your .env file.`;
    console.error('🚨 Environment Validation Failed:', errorMessage);
    console.error('💡 Copy .env.example to .env and fill in your API keys');
    throw new Error(errorMessage);
  }

  console.log('✅ Environment validation passed');

  if (validation.warnings.length > 0) {
    validation.warnings.forEach(warning => {
      console.warn('⚠️', warning);
    });
  }
}

/**
 * Validates specific feature requirements
 */
export const featureValidation = {
  geminiAnalysis: () => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY is required for document analysis features');
    }
    return apiKey;
  },

  supabase: () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!url) throw new Error('VITE_SUPABASE_URL is required');
    if (!key) throw new Error('VITE_SUPABASE_ANON_KEY is required');
    
    return { url, key };
  }
};