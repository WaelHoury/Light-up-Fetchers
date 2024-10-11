import AdvancedHttpClient from './HttpClient';

const client = new AdvancedHttpClient({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  maxRetries: 3,
  retryDelay: 1000,
});

// Add a request interceptor
client.addRequestInterceptor(async (config) => {
  // Simulate async token retrieval
  const token = await getAuthToken();
  config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// Add a response interceptor
client.addResponseInterceptor(
  (response) => {
    // Log the response
    console.log('Response:', response);
    return response;
  },
  (error) => {
    // Handle errors
    if (error.response && error.response.status === 401) {
      // Refresh token logic
      return refreshAuthToken().then(() => {
        error.config.__isRetryRequest = true;
        return client.request(error.config);
      });
    }
    return Promise.reject(error);
  }
);

// Make a GET request
client.get('/data')
  .then((response) => {
    console.log('Data:', response.data);
  })
  .catch((error) => {
    console.error('Error:', error);
  });
