import "dotenv/config";
import app from "../src/app.js";
import { ensureDefaultAdmin } from "../src/services/user.service.js";

let bootstrapPromise: Promise<void> | null = null;

async function bootstrapOnce() {
  if (!bootstrapPromise) {
    bootstrapPromise = ensureDefaultAdmin().then(() => undefined);
  }
  return bootstrapPromise;
}

export default async (req: any, res: any) => {
  await bootstrapOnce();
  return (app as any)(req, res);
};
