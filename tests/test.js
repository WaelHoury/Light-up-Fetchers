const xhrMock = require('xhr-mock').default; // Use require instead of import
const AdvancedHttpClient = require('../src/HttpClient');

describe('AdvancedHttpClient with XMLHttpRequest', () => {
  beforeEach(() => xhrMock.setup());
  afterEach(() => xhrMock.teardown());

  test('should perform a GET request', async () => {
    xhrMock.get('https://api.example.com/data', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: 'test' }),
    });

    const client = new AdvancedHttpClient({ baseURL: 'https://api.example.com' });
    const response = await client.get('/data');

    expect(response.data).toEqual({ data: 'test' });
  });

  test('should auto-parse JSON response', async () => {
    xhrMock.get('https://api.example.com/json', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'value' }),
    });

    const client = new AdvancedHttpClient({ baseURL: 'https://api.example.com' });
    const response = await client.get('/json');

    expect(response.data).toEqual({ key: 'value' });
  });

  test('should handle request interceptors', async () => {
    xhrMock.get('https://api.example.com/data', {
      status: 200,
      body: JSON.stringify({ data: 'test' }),
    });

    const client = new AdvancedHttpClient({ baseURL: 'https://api.example.com' });

    // Add request interceptor
    client.addRequestInterceptor((config) => {
      config.headers['X-Test-Header'] = 'test';
      return config;
    });

    await client.get('/data');

    const lastRequest = xhrMock.getRequest('https://api.example.com/data');
    expect(lastRequest.header('X-Test-Header')).toBe('test');
  });

  test('should handle response interceptors', async () => {
    xhrMock.get('https://api.example.com/data', {
      status: 200,
      body: JSON.stringify({ data: 'test' }),
    });

    const client = new AdvancedHttpClient({ baseURL: 'https://api.example.com' });

    // Add response interceptor
    client.addResponseInterceptor((response) => {
      response.data.extraField = 'extra';
      return response;
    });

    const response = await client.get('/data');
    expect(response.data.extraField).toBe('extra');
  });

  test('should handle retries on failure', async () => {
    let attempts = 0;
    xhrMock.get('https://api.example.com/retry', (req, res) => {
      attempts++;
      if (attempts < 3) {
        return res.status(500);
      }
      return res.status(200).body(JSON.stringify({ success: true }));
    });

    const client = new AdvancedHttpClient({
      baseURL: 'https://api.example.com',
      maxRetries: 3,
      retryDelay: 100,
    });

    const response = await client.get('/retry');
    expect(response.data).toEqual({ success: true });
    expect(attempts).toBe(3);
  });

  test('should handle timeout', async () => {
    xhrMock.get('https://api.example.com/timeout', () => {
      return new Promise((resolve) => setTimeout(() => resolve({ status: 200 }), 2000));
    });

    const client = new AdvancedHttpClient({
      baseURL: 'https://api.example.com',
      timeout: 500,
    });

    await expect(client.get('/timeout')).rejects.toThrow('Timeout of 500ms exceeded');
  });
});
