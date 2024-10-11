// utils.js
function mergeConfig(defaults, config) {
  const merged = {
    ...defaults,
    ...config
  };
  merged.headers = {
    ...defaults.headers,
    ...config.headers
  };
  return merged;
}
function buildFullURL(baseURL, requestedURL) {
  try {
    if (baseURL) {
      return new URL(requestedURL, baseURL).toString();
    } else {
      return new URL(requestedURL).toString();
    }
  } catch (e) {
    throw new Error('Invalid URL');
  }
}
function createError(message, config, code, request, response) {
  const error = new Error(message);
  error.config = config;
  if (code) {
    error.code = code;
  }
  error.request = request;
  error.response = response;
  error.isAxiosError = true; // For compatibility
  return error;
}
function enhanceError(error, config, code, request) {
  error.config = config;
  if (code) {
    error.code = code;
  }
  error.request = request;
  return error;
}
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
function getRetryDelay(baseDelay, retries) {
  return baseDelay * Math.pow(2, retries);
}
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
module.exports = {
  mergeConfig,
  buildFullURL,
  createError,
  enhanceError,
  delay,
  getRetryDelay,
  deepClone
};