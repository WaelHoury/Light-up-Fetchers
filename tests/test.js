// test.js
const AdvancedHttpClient = require('../src'); // Adjusted import path

const XMLHttpRequest = require('xhr2');
global.XMLHttpRequest = XMLHttpRequest;

global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');

jest.setTimeout(30000); // 30 seconds

describe('AdvancedHttpClient with XMLHttpRequest and Random User API', () => {
  test('should perform a GET request from Random User API', async () => {
    const client = new AdvancedHttpClient();

    const response = await client.get('https://randomuser.me/api/');
    expect(response.data.results).toHaveLength(1);
    console.log('Random User:', response.data.results[0]);
  });

  test('should auto-parse JSON response from Random User API', async () => {
    const client = new AdvancedHttpClient();
    const response = await client.get('https://randomuser.me/api/?results=1');

    expect(response.data.results).toHaveLength(1);
  });

  test('should handle request interceptors with Random User API', async () => {
    const client = new AdvancedHttpClient();

    client.addRequestInterceptor((config) => {
      config.headers['X-Test-Header'] = 'test-header-value';
      return config;
    });

    const response = await client.get('https://randomuser.me/api/?results=1');
    expect(response.data.results).toHaveLength(1);
    console.log('Request successful with headers interceptor.');
  });

  test('should handle response interceptors with Random User API', async () => {
    const client = new AdvancedHttpClient();

    client.addResponseInterceptor((response) => {
      response.data.extraField = 'extra-value';
      return response;
    });

    const response = await client.get('https://randomuser.me/api/?results=1');
    expect(response.data.extraField).toBe('extra-value');
  });

  test('should handle retries on failure with Random User API', async () => {
    const client = new AdvancedHttpClient({
      maxRetries: 3,
      retryDelay: 1000,
    });

    const response = await client.get('https://randomuser.me/api/?results=1');
    expect(response.data.results).toHaveLength(1);
  });

  test('should handle timeout with Random User API', async () => {
    const client = new AdvancedHttpClient({
      timeout: 1,
    });

    await expect(
      client.get('https://randomuser.me/api/?results=1')
    ).rejects.toThrow('Timeout of 1ms exceeded');
  });
});
