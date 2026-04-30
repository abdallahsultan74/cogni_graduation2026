import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { swaggerSpec } from "../src/config/swagger.ts";

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

const METHODS: HttpMethod[] = ["get", "post", "put", "patch", "delete"];
const SUPABASE_FUNCTIONS_BASE = "https://kqpvsncbbjuxzlmsysri.supabase.co/functions/v1";

type Endpoint = {
  method: string;
  path: string;
  fullUrl: string;
  auth: "Yes" | "No";
  summary: string;
};

const endpoints: Endpoint[] = [];

for (const [path, pathItem] of Object.entries(swaggerSpec.paths)) {
  for (const method of METHODS) {
    const operation = (pathItem as Record<string, any>)[method];
    if (!operation) continue;

    endpoints.push({
      method: method.toUpperCase(),
      path,
      fullUrl: `${SUPABASE_FUNCTIONS_BASE}${path}`,
      auth: operation.security?.length ? "Yes" : "No",
      summary: operation.summary ?? "-"
    });
  }
}

endpoints.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

const lines: string[] = [];
lines.push("# Frontend Endpoints (Supabase URL)");
lines.push("");
lines.push(`Base URL: \`${SUPABASE_FUNCTIONS_BASE}\``);
lines.push("");
lines.push("> Note: this list is generated from `src/config/swagger.ts`.");
lines.push("");
lines.push("| Method | Path | Full URL | Auth | Summary |");
lines.push("|---|---|---|---|---|");

for (const endpoint of endpoints) {
  lines.push(
    `| ${endpoint.method} | \`${endpoint.path}\` | \`${endpoint.fullUrl}\` | ${endpoint.auth} | ${endpoint.summary} |`
  );
}

lines.push("");

const outputPath = resolve(process.cwd(), "docs", "FRONTEND_ENDPOINTS_SUPABASE.md");
writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Generated ${endpoints.length} endpoints at ${outputPath}`);
