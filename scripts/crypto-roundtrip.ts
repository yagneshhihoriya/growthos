/**
 * Verifies AES-256-GCM encrypt/decrypt roundtrip (same API as app code).
 * Run: ENCRYPTION_KEY=$(grep ENCRYPTION_KEY .env.local | cut -d= -f2) npx tsx scripts/crypto-roundtrip.ts
 * Or ensure ENCRYPTION_KEY is exported in the shell.
 */
import { encrypt, decrypt } from "../src/lib/crypto";

const original = "test-meta-token-abc123";
const { ciphertext, iv, tag } = encrypt(original);
const decrypted = decrypt(ciphertext, iv, tag);
const ok = original === decrypted;
console.log("Match:", ok);
if (!ok) process.exit(1);
