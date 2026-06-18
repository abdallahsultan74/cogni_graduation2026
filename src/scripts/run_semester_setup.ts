import { ensureSemesters } from "./seed_semesters.js";
import { fixEnrollments } from "./fix_enrollment_semesters.js";

async function main() {
  await ensureSemesters();
  await fixEnrollments();
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
