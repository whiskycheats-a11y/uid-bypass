import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Keep-alive ping for Render free tier (prevents service spin-down)
  const selfPingUrl = (process.env.RENDER_EXTERNAL_URL || "https://uid-api-server.onrender.com").replace(/\/$/, "");
  
  // Wait 1 minute after boot, then ping every 10 minutes
  setTimeout(() => {
    const ping = () => {
      fetch(`${selfPingUrl}/api/healthz`)
        .then((res) => {
          logger.info({ status: res.status, url: selfPingUrl }, "Self-ping keep-alive status");
        })
        .catch((err) => {
          logger.warn({ err: err.message, url: selfPingUrl }, "Self-ping keep-alive warning");
        });
    };
    
    ping();
    setInterval(ping, 10 * 60 * 1000);
  }, 60 * 1000);
});
