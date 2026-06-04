// Central backend URL for the whole app.
// Local dev falls back to localhost. In production (Vercel),
// set VITE_SERVER_URL to your Render backend URL, e.g.
//   VITE_SERVER_URL=https://omnilearn-api.onrender.com
export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || "http://localhost:5000";
