#!/usr/bin/env node
import { prisma } from "../src/lib/prisma";

(async () => {
  const cutoff = new Date(Date.now() - 30 * 86400_000);
  const deleted = await prisma.session.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: cutoff } }, { revokedAt: { lt: cutoff } }],
    },
  });
  process.stdout.write(JSON.stringify({ event: "SESSIONS_PRUNED", deleted: deleted.count }) + "\n");
  await prisma.$disconnect();
})().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
