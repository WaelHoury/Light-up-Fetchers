// httpclient.js
const InterceptorManager = require('./interceptorManager');
const {
  mergeConfig,
  buildFullURL,
  createError,
  enhanceError,
  delay,
  getRetryDelay,
  deepClone
} = require('./utils');

// Include XMLHttpRequest from xhr2
const XMLHttpRequest = require('xhr2');
class AdvancedHttpClient {
  constructor(config = {}) {
    this.defaults = {
      baseURL: '',
      timeout: 5000,
      headers: {},
      maxRetries: 3,
      retryDelay: 1000,
      maxConcurrentRequests: 10,
      cache: false,
      responseType: '',
      // Set to empty string due to xhr2 limitations
      validateStatus: status => status >= 200 && status < 300,
      ...config
    };
    this.interceptors = {
      request: new InterceptorManager(),
      response: new InterceptorManager()
    };
    this.activeRequests = 0;
    this.requestQueue = [];
  }
  request(config) {
    config = mergeConfig(this.defaults, config);
    let promise = Promise.resolve(config);

    // Apply request interceptors
    this.interceptors.request.handlers.forEach(handler => {
      if (handler !== null) {
        promise = promise.then(handler.fulfilled, handler.rejected);
      }
    });

    // Dispatch request
    promise = promise.then(config => this.dispatchRequest(config));

    // Apply response interceptors
    this.interceptors.response.handlers.forEach(handler => {
      if (handler !== null) {
        promise = promise.then(handler.fulfilled, handler.rejected);
      }
    });
    return promise;
  }
  dispatchRequest(config) {
    return new Promise((resolve, reject) => {
      this.enqueueRequest(config, resolve, reject);
    });
  }
  enqueueRequest(config, resolve, reject) {
    this.requestQueue.push({
      config,
      resolve,
      reject
    });
    this.processQueue();
  }
  processQueue() {
    while (this.activeRequests < this.defaults.maxConcurrentRequests && this.requestQueue.length > 0) {
      const {
        config,
        resolve,
        reject
      } = this.requestQueue.shift();
      this.activeRequests++;
      this.makeRequest(config).then(resolve).catch(reject).finally(() => {
        this.activeRequests--;
        this.processQueue();
      });
    }
  }
  makeRequest(config, retries = 0) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = buildFullURL(config.baseURL, config.url);
      xhr.open(config.method.toUpperCase(), url, true);

      // Set timeout
      xhr.timeout = config.timeout;

      // Set headers (normalize header names to lowercase)
      for (const [key, value] of Object.entries(config.headers)) {
        xhr.setRequestHeader(key.toLowerCase(), value);
      }

      // Set responseType to empty string due to xhr2 limitations
      xhr.responseType = ''; // Do not set to 'json' in Node.js with xhr2

      // Handle progress events if needed
      if (config.onDownloadProgress) {
        xhr.onprogress = config.onDownloadProgress;
      }
      if (config.onUploadProgress && xhr.upload) {
        xhr.upload.onprogress = config.onUploadProgress;
      }

      // Handle response
      xhr.onload = () => {
        const responseHeaders = this.parseHeaders(xhr.getAllResponseHeaders());
        const responseData = this.getResponseData(xhr, responseHeaders);
        if (this.validateStatus(xhr.status, config.validateStatus)) {
          resolve({
            data: responseData,
            status: xhr.status,
            statusText: xhr.statusText,
            headers: responseHeaders,
            config,
            request: xhr
          });
        } else {
          reject(createError(`Request failed with status code ${xhr.status}`, config, xhr.status, xhr, {
            data: responseData,
            status: xhr.status,
            statusText: xhr.statusText,
            headers: responseHeaders,
            config,
            request: xhr
          }));
        }
      };
      xhr.onerror = () => {
        reject(enhanceError(new Error('Network Error'), config, null, xhr));
      };
      xhr.ontimeout = () => {
        reject(enhanceError(new Error(`Timeout of ${config.timeout}ms exceeded`), config, 'ECONNABORTED', xhr));
      };
      xhr.onabort = () => {
        reject(enhanceError(new Error('Request aborted'), config, 'ECONNABORTED', xhr));
      };

      // Send the request
      xhr.send(this.prepareRequestBody(config));
    }).catch(error => {
      if (this.shouldRetry(error, config, retries)) {
        const newConfig = deepClone(config);
        newConfig.__isRetryRequest = true;
        return delay(getRetryDelay(this.defaults.retryDelay, retries)).then(() => this.makeRequest(newConfig, retries + 1));
      }
      return Promise.reject(enhanceError(error, config));
    });
  }
  validateStatus(status, validateStatus) {
    const validator = validateStatus || this.defaults.validateStatus;
    return validator ? validator(status) : true;
  }
  parseHeaders(headers) {
    const parsed = {};
    if (!headers) {
      return parsed;
    }
    headers.trim().split(/[\r\n]+/).forEach(line => {
      const index = line.indexOf(':');
      if (index > 0) {
        const key = line.substring(0, index).trim().toLowerCase();
        const value = line.substring(index + 1).trim();
        parsed[key] = value;
      }
    });
    return parsed;
  }
  getResponseData(xhr, responseHeaders) {
    let responseData = xhr.response || xhr.responseText; // Use responseText if response is null
    console.log('Raw response data:', responseData);
    console.log('Response headers:', responseHeaders);

    // Attempt to parse JSON if content-type is 'application/json' and responseData is a string
    if (responseHeaders['content-type'] && responseHeaders['content-type'].includes('application/json') && typeof responseData === 'string') {
      try {
        responseData = JSON.parse(responseData);
        console.log('Parsed JSON response data:', responseData);
      } catch (e) {
        // Keep responseData as is if parsing fails
        console.error('Failed to parse JSON:', e);
      }
    }
    return responseData;
  }
  shouldRetry(error, config, retries) {
    const maxRetries = config.maxRetries || this.defaults.maxRetries;

    // Check if the error object has a config property
    if (!error.config) {
      return false; // If no config, it's not safe to retry
    }

    // Ensure the error is not a retry request
    return retries < maxRetries && !error.config.__isRetryRequest;
  }
  prepareRequestBody(config) {
    if (!config.data) return null;
    const contentType = config.headers['content-type'] || config.headers['Content-Type'];
    if (contentType && contentType.includes('application/json') && typeof config.data === 'object') {
      return JSON.stringify(config.data);
    }
    if (contentType && contentType.includes('application/x-www-form-urlencoded') && typeof config.data === 'object') {
      return new URLSearchParams(config.data).toString();
    }
    return config.data;
  }

  // HTTP methods
  get(url, config = {}) {
    return this.request({
      ...config,
      method: 'GET',
      url
    });
  }
  delete(url, config = {}) {
    return this.request({
      ...config,
      method: 'DELETE',
      url
    });
  }
  head(url, config = {}) {
    return this.request({
      ...config,
      method: 'HEAD',
      url
    });
  }
  options(url, config = {}) {
    return this.request({
      ...config,
      method: 'OPTIONS',
      url
    });
  }
  post(url, data = null, config = {}) {
    return this.request({
      ...config,
      method: 'POST',
      url,
      data
    });
  }
  put(url, data = null, config = {}) {
    return this.request({
      ...config,
      method: 'PUT',
      url,
      data
    });
  }
  patch(url, data = null, config = {}) {
    return this.request({
      ...config,
      method: 'PATCH',
      url,
      data
    });
  }

  // Interceptors
  addRequestInterceptor(fulfilled, rejected) {
    return this.interceptors.request.use(fulfilled, rejected);
  }
  addResponseInterceptor(fulfilled, rejected) {
    return this.interceptors.response.use(fulfilled, rejected);
  }

  // Authentication
  setAuthToken(token) {
    this.defaults.headers['authorization'] = `Bearer ${token}`;
  }
  setBasicAuth(username, password) {
    const encoded = Buffer.from(`${username}:${password}`).toString('base64');
    this.defaults.headers['authorization'] = `Basic ${encoded}`;
  }

  // Plugins
  use(plugin) {
    plugin(this);
  }
}
module.exports = AdvancedHttpClient;