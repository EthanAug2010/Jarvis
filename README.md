# JARVIS secure backend

This Express API accepts `POST /ask` with JSON `{ "message": "..." }` and returns `{ "reply": "..." }`.

## Deploy to Render

1. Upload these files to a new GitHub repository.
2. In Render, create **New → Web Service** and connect that repository.
3. Build command: `npm install`
4. Start command: `npm start`
5. In the Render service's **Environment** settings, add:
   - `OPENAI_API_KEY`: your secret API key
   - `OPENAI_MODEL`: `gpt-4.1-mini` (optional)
   - `FRONTEND_ORIGINS`: comma-separated exact origins for your hosted frontend, e.g. `https://your-site.example`
6. Deploy. Test `https://YOUR-SERVICE.onrender.com/health` and expect `{"ok":true,"service":"jarvis-backend"}`.

Do not put your API key in HTML, JavaScript shipped to users, GitHub, or an APK.
CORS only restricts browser origins; it is not authentication. The starter limits each client IP to 12 requests per minute, but the in-memory limiter is not shared across multiple instances and resets when the server restarts. For a public app, add user authentication and a shared rate-limit store (such as Redis) before distributing it widely.

## Frontend request example

Replace `https://YOUR-SERVICE.onrender.com` with your deployed backend URL:

```js
const response = await fetch("https://YOUR-SERVICE.onrender.com/ask", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: text })
});
const data = await response.json();
if (!response.ok) throw new Error(data.error || "Request failed");
const reply = data.reply;
```

If your HTML is opened directly as a `file://` URL, its origin may not match CORS. Test from a local web server or set `FRONTEND_ORIGINS` to the exact origin of your hosted frontend. Avoid allowing `null` or `*` as a production origin.
