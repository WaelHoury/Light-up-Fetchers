# 🎇 light-up-fetchers 🎇

#### Because HTTP requests should shine like those light-up Skechers! 💡👟

Welcome to **light-up-fetchers**, the HTTP client library that's here to make your API requests glow like a pair of fresh light-up Skechers! ✨ Why struggle with boring old Fetch or Axios when you can elevate your web development game with a client that's both **powerful** and **smooth**, like the song that inspired its name.

## Why light-up-fetchers?

Why use **light-up-fetchers** when you've already got Fetch and Axios? Well, hold on to your Skechers, because here’s why:

### ⚡ Features That _Light Up_:

- **🚀 XMLHttpRequest Power**: We built this bad boy using **XMLHttpRequest**, so you get **upload/download progress tracking** for free. Need to show off a progress bar when uploading files? We got you covered.
- **🔄 Auto JSON Parsing**: Tired of calling `.json()` every time? **light-up-fetchers** takes care of that for you. Just send your request, and we’ll handle the rest—like a butler for your data.
- **🔁 Automatic Retries**: Sometimes life gives you lemons (aka bad network connections). **light-up-fetchers** retries your request with **exponential backoff** until it gets it right. 🍋→🍋→🍋→🥤
- **🧘‍♂️ Chill Concurrency Control**: Don’t want to overload the server? Set a limit to your requests. Keep things calm and breezy with max concurrency.
- **⏱️ Custom Timeouts**: Impatient? We got you. If the server takes too long, we’ll time it out and let you move on with your life. Bye-bye long waits!
- **🔥 Interceptor Madness**: We’ve supercharged Axios’s interceptor game. Our interceptors are **asynchronous**, meaning they handle your token refreshes or error handling without breaking a sweat.
- **📈 Upload/Download Progress Tracking**: Want to show off a sweet progress bar while uploading that 100MB cat video? Yep, we’ve got real-time progress events built in. 🚀
- **🛡️ Error Handling**: Detailed error messages that tell you **exactly** what went wrong. No more “Why did this fail?” moments.

## Why is it Better than Fetch and Axios? 🎤🎵

**Light-up-fetchers** is like the neon-bright, flashy sibling of Fetch and Axios. Here’s how it kicks their boring, default features to the curb:

### 🥇 Better than Fetch:

- **Progress Tracking**: Fetch can't handle progress events for uploads, but **light-up-fetchers** will show you those glowing progress bars. ⚡️
- **Auto JSON Parsing**: Fetch makes you do `.json()`. We parse it for you, no questions asked.
- **Timeouts Without Tears**: Fetch makes you fiddle with `AbortController` for timeouts. **light-up-fetchers** does that automatically, like your favorite robot vacuum.
- **More Compatibility**: Works on older browsers that still rock **XMLHttpRequest**. Fetch who? 🕰️

### 🏆 More Powerful than Axios:

- **Async Interceptors**: Axios interceptors only dream about handling async tasks without breaking. We made it happen. Whether you're refreshing tokens or retrying requests, **light-up-fetchers** has your back.
- **Better Retry Logic**: Axios gives you retries, but **light-up-fetchers** gives you retries with style—**exponential backoff** to make sure your retries aren't just spammy. 🌀
- **Progress on Steroids**: Axios can track upload progress, but it skips download progress. We don’t. Watch both sides of your request like a hawk.

## Installation 🛠️

Ready to turn on the lights? Let’s get this party started. 🚀

```bash
npm install light-up-fetchers
```

## Usage 💻️

Just like putting on your Skechers, using light-up-fetchers is as easy as 1-2-3. 👟

```javascript
const lightUp = require("light-up-fetchers");

const client = new lightUp({
  baseURL: "https://api.skechers.com", // Not a real endpoint (yet) 😅
  timeout: 5000,
});

// Just light it up! 🚀
client
  .get("/shoes")
  .then((response) => {
    console.log("Check out these glowing kicks:", response.data);
  })
  .catch((error) => {
    console.error("Uh oh, something went wrong:", error.message);
  });
```

## Request Interceptors 🎯

```javascript
client.addRequestInterceptor((config) => {
  // Add a fancy Bearer token to all requests
  config.headers["Authorization"] = `Bearer my-glowing-token`;
  return config;
});
```

## Response Interceptors ✨

```javascript
client.addResponseInterceptor((response) => {
  // Modify the response with some extra style
  response.data.extraField = "Look at me shining!";
  return response;
});
```

## Automatic Retries 🚀

```javascript
client
  .get("/unstable-shoes", { maxRetries: 3, retryDelay: 1000 })
  .then((response) => console.log("Finally got those shoes:", response.data))
  .catch((error) => console.error("Request failed after retries:", error));
```

## Progress Events 📊

```javascript
client.post("/upload-skechers", formData, {
  onUploadProgress: (event) => {
    const percentCompleted = Math.round((event.loaded * 100) / event.total);
    console.log(`Upload Progress: ${percentCompleted}%`);
  },
});
```
