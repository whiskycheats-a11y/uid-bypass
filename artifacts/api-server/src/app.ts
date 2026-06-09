import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ── Strict Security Headers ────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Turn off CSP if frontend builds inline scripts
  crossOriginEmbedderPolicy: false,
}));
app.use(cookieParser());

// ── Legacy Security Headers (Handled mainly by helmet now) ────────────────
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

// ── CORS — strict whitelist in production ───────────────────────────────
const allowedOrigins: string[] = [];
if (process.env.NODE_ENV === "production") {
  // Allow same-origin requests (API serves frontend)
  // Add any custom domains here
  const customDomain = process.env.CORS_ORIGIN;
  if (customDomain) allowedOrigins.push(customDomain);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin requests (no origin header = same origin)
    if (!origin) return callback(null, true);
    // In development, allow all
    if (process.env.NODE_ENV !== "production") return callback(null, true);
    // In production, allow only whitelisted origins
    if (allowedOrigins.length === 0) {
      // If no custom origins set, allow same-origin only
      return callback(null, false);
    }
    if (allowedOrigins.includes(origin)) return callback(null, true);
    logger.warn({ origin }, "CORS blocked request from unauthorized origin");
    return callback(null, false);
  },
  credentials: true,
}));

// ── Global Rate Limiter (100 req/min per IP) ────────────────────────────
const globalRateMap = new Map<string, { count: number; resetAt: number }>();
const GLOBAL_RATE_LIMIT = 60;
const GLOBAL_RATE_WINDOW = 60 * 1000; // 1 minute

app.use((req: Request, res: Response, next: NextFunction): void => {
  const ip = ((req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "").split(",")[0]).trim() || "unknown";
  let record = globalRateMap.get(ip);
  const now = Date.now();
  
  if (!record || record.resetAt < now) {
    record = { count: 0, resetAt: now + GLOBAL_RATE_WINDOW };
    globalRateMap.set(ip, record);
  }
  
  record.count++;
  
  if (record.count > GLOBAL_RATE_LIMIT) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ success: false, error: "Too many requests. Slow down." });
    return;
  }
  
  next();
});

// Cleanup rate limit map every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of globalRateMap.entries()) {
    if (record.resetAt < now) globalRateMap.delete(ip);
  }
}, 5 * 60 * 1000);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));

app.use("/api", router);

// In production, serve the built Vite frontend and handle SPA routing
if (process.env.NODE_ENV === "production") {
  const frontendDist = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../uid-manager/dist/public",
  );

  if (existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get(/.*/, (_req, res) => {
      res.sendFile(path.join(frontendDist, "index.html"));
    });
    logger.info({ frontendDist }, "Serving frontend static files");
  } else {
    logger.warn({ frontendDist }, "Frontend dist not found — skipping static serving");
  }
}

export default app;
