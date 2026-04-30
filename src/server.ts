import app from "./app.js";
import "dotenv/config";
import { ensureDefaultAdmin } from "./services/user.service.js";

const PORT = process.env.PORT ?? 5000;

const bootstrap = async () => {
  await ensureDefaultAdmin();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
