import type { NonceStore } from "../../src/services/storage";

export function memoryNonceStore(): NonceStore {
  const nonces = new Map<string, { nonce: string; expiresAt: Date; createdAt: Date }>();
  return {
    async create(nonce, expiresAt) {
      nonces.set(nonce, { nonce, expiresAt, createdAt: new Date() });
    },
    async find(nonce) {
      return nonces.get(nonce) ?? null;
    },
    async consume(nonce, now) {
      const stored = nonces.get(nonce);
      if (!stored || stored.expiresAt <= now) return false;
      return nonces.delete(nonce);
    },
  };
}
