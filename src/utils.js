function mergeConfig(defaults, config) {
    const merged = { ...defaults, ...config };
    merged.headers = { ...defaults.headers, ...config.headers };
    return merged;
  }
  
  function buildFullURL(baseURL, requestedURL) {
    if (/^([a-z][a-z\d+\-.]*:)?\/\//i.test(requestedURL)) {
      return requestedURL;
    }
    return baseURL.replace(/\/+$/, '') + '/' + requestedURL.replace(/^\/+/, '');
  }
  
  function createError(message, config, response) {
    const error = new Error(message);
    error.config = config;
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
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  
  function getRetryDelay(baseDelay, retries) {
    return baseDelay * Math.pow(2, retries);
  }
  

  module.exports = {
    mergeConfig,
    buildFullURL,
    createError,
    enhanceError,
    delay,
    getRetryDelay,
  };