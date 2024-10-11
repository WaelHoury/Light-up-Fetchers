const InterceptorManager = require('./InterceptorManager');
const { mergeConfig, buildFullURL, createError, enhanceError, delay, getRetryDelay } = require('./utils');

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
      responseType: 'json', // default responseType
      ...config,
    };

    this.interceptors = {
      request: new InterceptorManager(),
      response: new InterceptorManager(),
    };

    this.activeRequests = 0;
    this.requestQueue = [];
  }

  request(config) {
    config = mergeConfig(this.defaults, config);

    let promise = Promise.resolve(config);

    // Apply request interceptors
    this.interceptors.request.handlers.forEach(({ fulfilled, rejected }) => {
      promise = promise.then(fulfilled, rejected);
    });

    // Dispatch request
    promise = promise.then((config) => this.dispatchRequest(config));

    // Apply response interceptors
    this.interceptors.response.handlers.forEach(({ fulfilled, rejected }) => {
      promise = promise.then(fulfilled, rejected);
    });

    return promise;
  }

  dispatchRequest(config) {
    return new Promise((resolve, reject) => {
      this.enqueueRequest(config, resolve, reject);
    });
  }

  enqueueRequest(config, resolve, reject) {
    this.requestQueue.push({ config, resolve, reject });
    this.processQueue();
  }

  processQueue() {
    while (
      this.activeRequests < this.defaults.maxConcurrentRequests &&
      this.requestQueue.length > 0
    ) {
      const { config, resolve, reject } = this.requestQueue.shift();
      this.activeRequests++;
      this.makeRequest(config)
        .then(resolve)
        .catch(reject)
        .finally(() => {
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

      // Set headers
      for (const [key, value] of Object.entries(config.headers)) {
        xhr.setRequestHeader(key, value);
      }

      // Response Type
      xhr.responseType = config.responseType !== 'json' ? config.responseType : '';

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
        const responseData = this.getResponseData(xhr, config.responseType, responseHeaders);

        if (this.validateStatus(xhr.status, config.validateStatus)) {
          resolve({
            data: responseData,
            status: xhr.status,
            statusText: xhr.statusText,
            headers: responseHeaders,
            config,
            request: xhr,
          });
        } else {
          reject(
            createError(
              `Request failed with status code ${xhr.status}`,
              config,
              {
                data: responseData,
                status: xhr.status,
                statusText: xhr.statusText,
                headers: responseHeaders,
                config,
                request: xhr,
              }
            )
          );
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
    }).catch((error) => {
      if (this.shouldRetry(error, config, retries)) {
        return delay(getRetryDelay(this.defaults.retryDelay, retries)).then(() =>
          this.makeRequest(config, retries + 1)
        );
      }
      throw enhanceError(error, config);
    });
  }

  validateStatus(status, validateStatus) {
    if (!validateStatus) {
      return status >= 200 && status < 300;
    }
    return validateStatus(status);
  }

  parseHeaders(headers) {
    const parsed = {};
    if (!headers) {
      return parsed;
    }
    headers.trim().split(/[\r\n]+/).forEach((line) => {
      const [key, ...vals] = line.split(': ');
      const value = vals.join(': ');
      parsed[key.toLowerCase()] = value;
    });
    return parsed;
  }

  getResponseData(xhr, responseType, responseHeaders) {
    let responseData = xhr.response;

    // Auto-parse JSON
    if (
      responseType === 'json' &&
      responseHeaders['content-type'] &&
      responseHeaders['content-type'].includes('application/json') &&
      typeof responseData === 'string'
    ) {
      try {
        responseData = JSON.parse(responseData);
      } catch (e) {
        // Keep responseData as is if parsing fails
      }
    }

    return responseData;
  }

  shouldRetry(error, config, retries) {
    const maxRetries = config.maxRetries || this.defaults.maxRetries;
    return retries < maxRetries && !error.config.__isRetryRequest;
  }

  prepareRequestBody(config) {
    if (!config.data) return null;

    if (
      config.headers['Content-Type'] &&
      config.headers['Content-Type'].includes('application/json') &&
      typeof config.data === 'object'
    ) {
      return JSON.stringify(config.data);
    }

    return config.data;
  }

  // HTTP methods
  get(url, config = {}) {
    return this.request({ ...config, method: 'GET', url });
  }

  delete(url, config = {}) {
    return this.request({ ...config, method: 'DELETE', url });
  }

  head(url, config = {}) {
    return this.request({ ...config, method: 'HEAD', url });
  }

  options(url, config = {}) {
    return this.request({ ...config, method: 'OPTIONS', url });
  }

  post(url, data = null, config = {}) {
    return this.request({ ...config, method: 'POST', url, data });
  }

  put(url, data = null, config = {}) {
    return this.request({ ...config, method: 'PUT', url, data });
  }

  patch(url, data = null, config = {}) {
    return this.request({ ...config, method: 'PATCH', url, data });
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
    this.defaults.headers['Authorization'] = `Bearer ${token}`;
  }

  setBasicAuth(username, password) {
    const encoded = btoa(`${username}:${password}`);
    this.defaults.headers['Authorization'] = `Basic ${encoded}`;
  }

  // Plugins
  use(plugin) {
    plugin(this);
  }
}

module.exports = AdvancedHttpClient;
