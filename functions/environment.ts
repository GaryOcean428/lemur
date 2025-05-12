import * as functions from 'firebase-functions';
import * as dotenv from 'dotenv';

// Load environment variables from .env file in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Define environment configuration interface
export interface EnvironmentConfig {
  // Firebase project configuration
  firebase: {
    projectId: string;
    clientEmail: string;
    privateKey: string;
  };
  
  // Database connection
  database: {
    url: string;
    sessionSecret: string;
  };
  
  // External API keys
  apis: {
    groq: string;
    openai: string;
    tavily: string;
    serper: string;
    stripe: {
      secretKey: string;
      basicPriceId: string;
      proPriceId: string;
    };
  };
  
  // Redis/KV storage
  redis: {
    url: string;
    restApiUrl: string;
    restApiToken: string;
  };
}

// Function to get environment variables, prioritizing Firebase config
export function getConfig(): EnvironmentConfig {
  // In production, use Firebase Functions config
  if (process.env.NODE_ENV === 'production') {
    const config = functions.config();
    
    return {
      firebase: {
        projectId: config.firebase?.project_id || process.env.FIREBASE_PROJECT_ID || '',
        clientEmail: config.firebase?.client_email || process.env.FIREBASE_CLIENT_EMAIL || '',
        privateKey: config.firebase?.private_key?.replace(/\\n/g, '\n') || 
                    process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
      },
      database: {
        url: config.database?.url || process.env.DATABASE_URL || '',
        sessionSecret: config.database?.session_secret || process.env.SESSION_SECRET || '',
      },
      apis: {
        groq: config.apis?.groq || process.env.GROQ_API_KEY || '',
        openai: config.apis?.openai || process.env.OPENAI_API_KEY || '',
        tavily: config.apis?.tavily || process.env.TAVILY_API_KEY || '',
        serper: config.apis?.serper || process.env.SERPER_API_KEY || '',
        stripe: {
          secretKey: config.apis?.stripe?.secret_key || process.env.STRIPE_SECRET_KEY || '',
          basicPriceId: config.apis?.stripe?.basic_price_id || process.env.STRIPE_BASIC_PRICE_ID || '',
          proPriceId: config.apis?.stripe?.pro_price_id || process.env.STRIPE_PRO_PRICE_ID || '',
        },
      },
      redis: {
        url: config.redis?.url || process.env.REDIS_URL || '',
        restApiUrl: config.redis?.rest_api_url || process.env.KV_REST_API_URL || '',
        restApiToken: config.redis?.rest_api_token || process.env.KV_REST_API_TOKEN || '',
      }
    };
  }
  
  // In development, use environment variables
  return {
    firebase: {
      projectId: process.env.FIREBASE_PROJECT_ID || '',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
    },
    database: {
      url: process.env.DATABASE_URL || '',
      sessionSecret: process.env.SESSION_SECRET || '',
    },
    apis: {
      groq: process.env.GROQ_API_KEY || '',
      openai: process.env.OPENAI_API_KEY || '',
      tavily: process.env.TAVILY_API_KEY || '',
      serper: process.env.SERPER_API_KEY || '',
      stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY || '',
        basicPriceId: process.env.STRIPE_BASIC_PRICE_ID || '',
        proPriceId: process.env.STRIPE_PRO_PRICE_ID || '',
      },
    },
    redis: {
      url: process.env.REDIS_URL || '',
      restApiUrl: process.env.KV_REST_API_URL || '',
      restApiToken: process.env.KV_REST_API_TOKEN || '',
    }
  };
}

// Export config for easy access
export const config = getConfig();