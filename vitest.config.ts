import { defineConfig } from "vitest/config";
import dotenv from "dotenv";
import path from "path";

// Load root .env so Prisma Client and the API can find DATABASE_URL / SESSION_SECRET
dotenv.config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/**/*.test.ts", "apps/api/src/**/*.test.ts"],
    testTimeout: 15_000,
    hookTimeout: 15_000,
    // Do not run API tests in parallel; they share a database
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
