// flash10-backend/src/jobs/keepAlive.js
// Pings the server's own health endpoint every 10 minutes
// This prevents Render free tier from sleeping between cron-job.org calls
import https from "https";

function selfPing() {
  const host = process.env.RENDER_EXTERNAL_URL
    ? new URL(process.env.RENDER_EXTERNAL_URL).hostname
    : "flash10-backend.onrender.com";

  const req = https.request(
    { hostname: host, path: "/health", method: "GET", timeout: 10000 },
    (res) => {
      console.log(`💓 Keep-alive ping: ${res.statusCode}`);
    }
  );
  req.on("error", () => {}); // silently ignore errors
  req.on("timeout", () => req.destroy());
  req.end();
}

export function startKeepAlive() {
  // Only run on Render (not locally)
  if (!process.env.RENDER) {
    console.log("⏭️  Keep-alive skipped (not on Render)");
    return;
  }

  // Wait 1 minute after startup, then ping every 10 minutes
  setTimeout(() => {
    selfPing();
    setInterval(selfPing, 10 * 60 * 1000);
  }, 60 * 1000);

  console.log("💓 Keep-alive started: pinging every 10 minutes");
}
