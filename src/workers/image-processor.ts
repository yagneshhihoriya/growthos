/**
 * Legacy BullMQ worker for batch marketplace processing.
 * Photo Studio now runs generation synchronously via POST /api/images/generate.
 * This script exits immediately so `npm run worker:image` does not fail the build.
 */
console.info(
  "[worker:image] Deprecated — Photo Studio uses POST /api/images/generate. No queue worker is required."
);
process.exit(0);
