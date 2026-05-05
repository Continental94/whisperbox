// E2EE using Web Crypto API
// RSA-OAEP for key exchange, AES-GCM for message encryption

// ── Generate RSA Key Pair ──────────────────────
export async function generateKeyPair() {
  return window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );
}

// ── Export Public Key ──────────────────────────
export async function exportPublicKey(publicKey) {
  const exported = await window.crypto.subtle.exportKey('spki', publicKey);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

// ── Import Public Key ──────────────────────────
export async function importPublicKey(base64Key) {
  const binary = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
  return window.crypto.subtle.importKey(
    'spki',
    binary,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt']
  );
}

// ── Import Private Key ─────────────────────────
export async function importPrivateKey(base64Key) {
  const binary = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
  return window.crypto.subtle.importKey(
    'pkcs8',
    binary,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['decrypt']
  );
}

// ── Wrap Private Key with Password ────────────
export async function wrapPrivateKey(privateKey, password) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const exportedKey = await window.crypto.subtle.exportKey('pkcs8', privateKey);

  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const aesGcmKey = await window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  const wrapped = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesGcmKey,
    exportedKey
  );

  const combined = new Uint8Array(salt.length + iv.length + wrapped.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(wrapped), salt.length + iv.length);

  return {
    wrappedPrivateKey: btoa(String.fromCharCode(...combined)),
    pbkdf2Salt: btoa(String.fromCharCode(...salt)),
  };
}

// ── Unwrap Private Key with Password ──────────
export async function unwrapPrivateKey(wrappedKeyBase64, saltBase64, password) {
  const combined = Uint8Array.from(atob(wrappedKeyBase64), c => c.charCodeAt(0));
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const wrappedKey = combined.slice(28);

  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const aesGcmKey = await window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesGcmKey,
    wrappedKey
  );

  return window.crypto.subtle.importKey(
    'pkcs8',
    decrypted,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['decrypt']
  );
}

// ── Generate AES Key ───────────────────────────
async function generateAESKey() {
  return window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// ── Encrypt Message ────────────────────────────
export async function encryptMessage(plaintext, recipientPublicKey, senderPublicKey) {
  const aesKey = await generateAESKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(plaintext);

  const encryptedMessage = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    encodedText
  );

  const exportedAESKey = await window.crypto.subtle.exportKey('raw', aesKey);

  const encryptedKeyForRecipient = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    recipientPublicKey,
    exportedAESKey
  );

  const encryptedKeyForSender = senderPublicKey
    ? await window.crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        senderPublicKey,
        exportedAESKey
      )
    : null;

  return {
    encryptedMessage: btoa(String.fromCharCode(...new Uint8Array(encryptedMessage))),
    encryptedKey: btoa(String.fromCharCode(...new Uint8Array(encryptedKeyForRecipient))),
    encryptedKeySender: encryptedKeyForSender
      ? btoa(String.fromCharCode(...new Uint8Array(encryptedKeyForSender)))
      : null,
    iv: btoa(String.fromCharCode(...iv)),
  };
}

// ── Decrypt Message ────────────────────────────
export async function decryptMessage(encryptedData, privateKey) {
  try {
    const { encryptedMessage, encryptedKey, encryptedKeySender, iv } = encryptedData;

    const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
    const encryptedMessageBytes = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0));

    let aesKeyBytes;

    // Try recipient key first
    try {
      const keyBytes = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0));
      aesKeyBytes = await window.crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        privateKey,
        keyBytes
      );
    } catch {
      // Try sender key fallback
      if (encryptedKeySender) {
        const senderKeyBytes = Uint8Array.from(atob(encryptedKeySender), c => c.charCodeAt(0));
        aesKeyBytes = await window.crypto.subtle.decrypt(
          { name: 'RSA-OAEP' },
          privateKey,
          senderKeyBytes
        );
      } else {
        throw new Error('Cannot decrypt with available keys');
      }
    }

    const aesKey = await window.crypto.subtle.importKey(
      'raw',
      aesKeyBytes,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const decryptedMessage = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      aesKey,
      encryptedMessageBytes
    );

    return new TextDecoder().decode(decryptedMessage);
  } catch (error) {
    console.error('Decryption failed:', error);
    return '🔒 [Encrypted message]';
  }
}