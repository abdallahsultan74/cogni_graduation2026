/**
 * نقطة دخول Vercel (Serverless) — يُبنى المشروع أولًا (`npm run build`) فيُحمّل `dist/app.js`.
 * على Render/تشغيل محلي استخدم `npm start` → `dist/server.js`.
 */
import app from "../dist/app.js";

export default app;
