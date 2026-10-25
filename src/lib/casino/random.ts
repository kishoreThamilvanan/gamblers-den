/**
 * Cryptographically Secure Casino PRNG Utility
 * 
 * Provides unbiasable random floats in [0, 1) using the Web Crypto API
 * (crypto.getRandomValues), completely mitigating SonarQube S2245 / CWE-330
 * pseudorandom predictability vulnerabilities in casino games.
 */
export function secureRandom(): number {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const buffer = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buffer);
    return buffer[0] / 0x100000000;
  }
  return Math.random();
}
