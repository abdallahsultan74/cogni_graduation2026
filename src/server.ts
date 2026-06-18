import app from "./app.js";
import "dotenv/config";
import { logger } from "./config/logger.js";
import { ensureDefaultAdmin } from "./services/user.service.js";

const PORT = process.env.PORT ?? 5000;

const bootstrap = async () => {
  await ensureDefaultAdmin();

  if (!process.env.RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY is not set — password reset OTPs will be logged, not emailed");
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
