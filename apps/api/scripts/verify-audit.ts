#!/usr/bin/env node
import { verifyAuditChain } from "../src/lib/audit";
import { prisma } from "../src/lib/prisma";

(async () => {
  const result = await verifyAuditChain();
  await prisma.$disconnect();
  if (!result.ok) {
    console.error(JSON.stringify({ event: "AUDIT_CHAIN_BROKEN", ...result }));
    process.exit(1);
  }
  process.stdout.write(JSON.stringify({ event: "AUDIT_CHAIN_OK", ...result }) + "\n");
})().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
