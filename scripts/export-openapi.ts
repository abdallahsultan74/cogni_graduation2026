import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { swaggerSpec } from "../src/config/swagger.ts";

const outputPath = resolve(process.cwd(), "docs", "openapi.json");
writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2), "utf8");
console.log(`OpenAPI spec exported to ${outputPath}`);
