import { identityService } from './identityService';

export const cryptoService = {
  // Generate a derived AES key based on the user's ID
  async getDerivedKey(): Promise<CryptoKey> {
    const uid = identityService.getUserId();
    const enc = new TextEncoder();
    
    // Use PBKDF2 to derive a strong key from the UID
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(uid + "_zen_secret_key_material"),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );
    
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: enc.encode("zen_app_salt_2026_v1"),
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  },

  // Legacy method for backward compatibility
  async getLegacyMasterKey(): Promise<CryptoKey | null> {
    const keyStr = localStorage.getItem('zen_master_key');
    if (keyStr) {
      try {
        const keyBuffer = Uint8Array.from(atob(keyStr), c => c.charCodeAt(0));
        return await crypto.subtle.importKey(
          'raw',
          keyBuffer,
          { name: 'AES-GCM' },
          true,
          ['encrypt', 'decrypt']
        );
      } catch (e) {
        return null;
      }
    }
    return null;
  },

  async encrypt(text: string): Promise<{ ciphertext: string; iv: string }> {
    const key = await this.getDerivedKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(text);
    
    const ciphertextBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );
    
    return {
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer))),
      iv: btoa(String.fromCharCode(...new Uint8Array(iv)))
    };
  },

  async decrypt(ciphertextStr: string, ivStr: string): Promise<string> {
    try {
      const ciphertext = Uint8Array.from(atob(ciphertextStr), c => c.charCodeAt(0));
      const iv = Uint8Array.from(atob(ivStr), c => c.charCodeAt(0));
      
      // Try derived key first (new standard)
      try {
        const key = await this.getDerivedKey();
        const decryptedBuffer = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          key,
          ciphertext
        );
        return new TextDecoder().decode(decryptedBuffer);
      } catch (derivedErr) {
        // If derived key fails, try legacy key
        const legacyKey = await this.getLegacyMasterKey();
        if (legacyKey) {
          const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            legacyKey,
            ciphertext
          );
          return new TextDecoder().decode(decryptedBuffer);
        }
        throw derivedErr; // Re-throw if legacy key also fails or doesn't exist
      }
    } catch (e) {
      // Use console.warn instead of console.error to prevent the app from showing a red error overlay
      // for expected decryption failures (e.g., when a user logs in on a new device and old encrypted data cannot be decrypted).
      console.warn('Decryption failed for a record (likely created on another device or before login).');
      return '【加密数据无法解密】';
    }
  },

  // Clear legacy master key from localStorage
  clearLegacyKey() {
    localStorage.removeItem('zen_master_key');
  } 
};
