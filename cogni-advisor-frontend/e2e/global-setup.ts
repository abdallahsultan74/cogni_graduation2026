const API = process.env.COGNI_API_BASE_URL ?? "http://localhost:5000";

export default async function globalSetup() {
  try {
    const res = await fetch(`${API}/api/health`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      throw new Error(`Backend health check failed: ${res.status}`);
    }
  } catch {
    throw new Error(
      `Backend غير شغّال على ${API}. شغّل: npm run dev (من جذر المشروع)`
    );
  }
}
