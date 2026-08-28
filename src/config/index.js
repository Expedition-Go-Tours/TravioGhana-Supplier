/**
 * Application Configuration
 * Reads Vite environment variables with safe fallbacks.
 * Never crashes the app — missing values degrade gracefully.
 *
 * NOTE: All import.meta.env.VITE_* accesses MUST use static property
 * access (dot notation). Dynamic access like import.meta.env?.[key]
 * cannot be statically inlined by Vite/Rolldown and will return
 * undefined in production builds.
 */

function envString(value, defaultValue) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  if (typeof value === 'string' && value.startsWith('__REPLACE_WITH_')) {
    return defaultValue;
  }
  return value;
}

function envBool(value, defaultValue) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return value === 'true' || value === true;
}

function envNum(value, defaultValue) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  const num = Number(value);
  return Number.isNaN(num) ? defaultValue : num;
}

// Detect environment from Vite's built-in mode or env var
const viteMode = envString(import.meta.env.MODE, 'production');
const appEnv = envString(import.meta.env.VITE_APP_ENV, viteMode);
const isDev = appEnv === 'development';

// Safe env parsing with sensible defaults
const env = {
  // API
  VITE_API_BASE_URL: envString(import.meta.env.VITE_API_BASE_URL, ''),
  VITE_API_TIMEOUT: envNum(import.meta.env.VITE_API_TIMEOUT, 30000),
  VITE_API_RETRY_ATTEMPTS: envNum(import.meta.env.VITE_API_RETRY_ATTEMPTS, 3),

  // Auth
  VITE_AUTH_PROVIDER: envString(import.meta.env.VITE_AUTH_PROVIDER, 'firebase'),
  VITE_AUTH_API_BASE_URL: envString(import.meta.env.VITE_AUTH_API_BASE_URL, ''),
  VITE_TOKEN_REFRESH_INTERVAL: envNum(import.meta.env.VITE_TOKEN_REFRESH_INTERVAL, 300000),
  VITE_SESSION_TIMEOUT: envNum(import.meta.env.VITE_SESSION_TIMEOUT, 3600000),

  // Firebase
  VITE_FIREBASE_API_KEY: envString(import.meta.env.VITE_FIREBASE_API_KEY, ''),
  VITE_FIREBASE_AUTH_DOMAIN: envString(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, ''),
  VITE_FIREBASE_PROJECT_ID: envString(import.meta.env.VITE_FIREBASE_PROJECT_ID, ''),
  VITE_FIREBASE_APP_ID: envString(import.meta.env.VITE_FIREBASE_APP_ID, ''),
  VITE_FIREBASE_MESSAGING_SENDER_ID: envString(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, ''),

  // Features
  VITE_FEATURE_ANALYTICS: envBool(import.meta.env.VITE_FEATURE_ANALYTICS, true),
  VITE_FEATURE_NOTIFICATIONS: envBool(import.meta.env.VITE_FEATURE_NOTIFICATIONS, true),
  VITE_FEATURE_REAL_TIME_UPDATES: envBool(import.meta.env.VITE_FEATURE_REAL_TIME_UPDATES, false),
  VITE_FEATURE_ADVANCED_FILTERS: envBool(import.meta.env.VITE_FEATURE_ADVANCED_FILTERS, true),
  VITE_FEATURE_EXPORT_DATA: envBool(import.meta.env.VITE_FEATURE_EXPORT_DATA, true),
  VITE_FEATURE_BULK_ACTIONS: envBool(import.meta.env.VITE_FEATURE_BULK_ACTIONS, true),

  // Monitoring
  VITE_SENTRY_DSN: envString(import.meta.env.VITE_SENTRY_DSN, ''),
  VITE_SENTRY_ENVIRONMENT: envString(import.meta.env.VITE_SENTRY_ENVIRONMENT, 'production'),
  VITE_DEBUG_MODE: envBool(import.meta.env.VITE_DEBUG_MODE, isDev),
  VITE_LOG_LEVEL: envString(import.meta.env.VITE_LOG_LEVEL, 'error'),

  // Analytics
  VITE_GA_MEASUREMENT_ID: envString(import.meta.env.VITE_GA_MEASUREMENT_ID, ''),
  VITE_ENABLE_ANALYTICS: envBool(import.meta.env.VITE_ENABLE_ANALYTICS, false),

  // App
  VITE_APP_NAME: envString(import.meta.env.VITE_APP_NAME, 'Travio Ghana Supplier Dashboard'),
  VITE_APP_VERSION: envString(import.meta.env.VITE_APP_VERSION, '1.0.0'),
  VITE_APP_ENV: appEnv,
  VITE_BASE_URL: envString(import.meta.env.VITE_BASE_URL, '/'),

  // Performance
  VITE_ENABLE_SERVICE_WORKER: envBool(import.meta.env.VITE_ENABLE_SERVICE_WORKER, false),
  VITE_CACHE_STRATEGY: envString(import.meta.env.VITE_CACHE_STRATEGY, 'network-first'),

  // Upload
  VITE_MAX_FILE_SIZE: envNum(import.meta.env.VITE_MAX_FILE_SIZE, 5242880),
  VITE_ALLOWED_FILE_TYPES: envString(import.meta.env.VITE_ALLOWED_FILE_TYPES, 'image/jpeg,image/png,image/gif,image/webp,application/pdf'),

  // Pagination
  VITE_DEFAULT_PAGE_SIZE: envNum(import.meta.env.VITE_DEFAULT_PAGE_SIZE, 25),
  VITE_MAX_PAGE_SIZE: envNum(import.meta.env.VITE_MAX_PAGE_SIZE, 100),

  // Google
  VITE_GOOGLE_CLIENT_ID: envString(import.meta.env.VITE_GOOGLE_CLIENT_ID, ''),
  VITE_GOOGLE_MAPS_API_KEY: envString(import.meta.env.VITE_GOOGLE_MAPS_API_KEY, ''),

  // Third-party
  VITE_STRIPE_PUBLIC_KEY: envString(import.meta.env.VITE_STRIPE_PUBLIC_KEY, ''),
  VITE_INTERCOM_APP_ID: envString(import.meta.env.VITE_INTERCOM_APP_ID, ''),

  // Public platforms (live product preview URLs)
  VITE_TRAVIO_AFRICA_URL: envString(import.meta.env.VITE_TRAVIO_AFRICA_URL, 'https://travioghana.com'),
  VITE_EXPEDITION_GO_URL: envString(import.meta.env.VITE_EXPEDITION_GO_URL, 'https://expeditiongotours.vercel.app'),

  // Support
  VITE_ADMIN_SUPPORT_ID: envString(import.meta.env.VITE_ADMIN_SUPPORT_ID, ''),

  // Dev tools
  VITE_ENABLE_REACT_QUERY_DEVTOOLS: envBool(import.meta.env.VITE_ENABLE_REACT_QUERY_DEVTOOLS, isDev),
  VITE_ENABLE_REDUX_DEVTOOLS: envBool(import.meta.env.VITE_ENABLE_REDUX_DEVTOOLS, isDev),
  VITE_MOCK_API: envBool(import.meta.env.VITE_MOCK_API, false),
};

// Warn in development if any critical values are missing or using defaults
if (isDev) {
  const criticalKeys = ['VITE_API_BASE_URL', 'VITE_AUTH_PROVIDER'];
  const missing = criticalKeys.filter((k) => !import.meta.env[k]);
  if (missing.length > 0) {
    console.warn(
      '[config] Some environment variables are missing; using defaults for:',
      missing.join(', ')
    );
  }
}

export const config = {
  api: {
    baseURL: env.VITE_API_BASE_URL,
    timeout: env.VITE_API_TIMEOUT,
    retryAttempts: env.VITE_API_RETRY_ATTEMPTS,
  },

  auth: {
    provider: env.VITE_AUTH_PROVIDER,
    apiBaseURL: env.VITE_AUTH_API_BASE_URL,
    tokenRefreshInterval: env.VITE_TOKEN_REFRESH_INTERVAL,
    sessionTimeout: env.VITE_SESSION_TIMEOUT,
    firebase: {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      appId: env.VITE_FIREBASE_APP_ID,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    },
  },

  features: {
    analytics: env.VITE_FEATURE_ANALYTICS,
    notifications: env.VITE_FEATURE_NOTIFICATIONS,
    realTimeUpdates: env.VITE_FEATURE_REAL_TIME_UPDATES,
    advancedFilters: env.VITE_FEATURE_ADVANCED_FILTERS,
    exportData: env.VITE_FEATURE_EXPORT_DATA,
    bulkActions: env.VITE_FEATURE_BULK_ACTIONS,
  },

  monitoring: {
    sentryDSN: env.VITE_SENTRY_DSN,
    sentryEnvironment: env.VITE_SENTRY_ENVIRONMENT,
    debugMode: env.VITE_DEBUG_MODE,
    logLevel: env.VITE_LOG_LEVEL,
  },

  analytics: {
    gaMeasurementId: env.VITE_GA_MEASUREMENT_ID,
    enabled: env.VITE_ENABLE_ANALYTICS,
  },

  app: {
    name: env.VITE_APP_NAME,
    version: env.VITE_APP_VERSION,
    environment: env.VITE_APP_ENV,
    baseURL: env.VITE_BASE_URL,
  },

  performance: {
    enableServiceWorker: env.VITE_ENABLE_SERVICE_WORKER,
    cacheStrategy: env.VITE_CACHE_STRATEGY,
  },

  upload: {
    maxFileSize: env.VITE_MAX_FILE_SIZE,
    allowedFileTypes: env.VITE_ALLOWED_FILE_TYPES.split(','),
  },

  pagination: {
    defaultPageSize: env.VITE_DEFAULT_PAGE_SIZE,
    maxPageSize: env.VITE_MAX_PAGE_SIZE,
  },

  google: {
    clientId: env.VITE_GOOGLE_CLIENT_ID,
  },

  maps: {
    googleMapsApiKey: env.VITE_GOOGLE_MAPS_API_KEY,
  },

  integrations: {
    stripePublicKey: env.VITE_STRIPE_PUBLIC_KEY,
    intercomAppId: env.VITE_INTERCOM_APP_ID,
  },

  support: {
    adminId: env.VITE_ADMIN_SUPPORT_ID,
  },

  devTools: {
    enableReactQueryDevtools: env.VITE_ENABLE_REACT_QUERY_DEVTOOLS,
    enableReduxDevtools: env.VITE_ENABLE_REDUX_DEVTOOLS,
    mockAPI: env.VITE_MOCK_API,
  },

  isDevelopment: () => env.VITE_APP_ENV === 'development',
  isProduction: () => env.VITE_APP_ENV === 'production',
  isStaging: () => env.VITE_APP_ENV === 'staging',
};

export default config;
