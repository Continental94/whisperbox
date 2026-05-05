import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  generateKeyPair,
  exportPublicKey,
  wrapPrivateKey,
  unwrapPrivateKey,
  importPrivateKey,
} from '../crypto/e2ee';
import { savePrivateKey, getPrivateKey, deletePrivateKey } from '../db/keyStore';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('wb_token');
    const savedUser = localStorage.getItem('wb_user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const register = async (username, password) => {
    // Generate RSA key pair
    const keyPair = await generateKeyPair();

    // Export public key
    const publicKeyBase64 = await exportPublicKey(keyPair.publicKey);

    // Wrap private key with password using AES-KW + PBKDF2
    const { wrappedPrivateKey, pbkdf2Salt } = await wrapPrivateKey(keyPair.privateKey, password);

    // Register with server
    const data = await api.register(
      username,
      username, // display_name same as username
      password,
      publicKeyBase64,
      wrappedPrivateKey,
      pbkdf2Salt
    );

    // Save token
    localStorage.setItem('wb_token', data.access_token);

    // Save user info
    const userData = {
      id: data.user.id,
      username: data.user.username,
      display_name: data.user.display_name,
    };
    localStorage.setItem('wb_user', JSON.stringify(userData));

    // Save private key to IndexedDB
    const exportedPrivateKey = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(exportedPrivateKey)));
    await savePrivateKey(data.user.id, privateKeyBase64);

    // Save wrapped key data for recovery
    localStorage.setItem('wb_wrapped_key', wrappedPrivateKey);
    localStorage.setItem('wb_salt', pbkdf2Salt);

    setUser(userData);
    return userData;
  };

  const login = async (username, password) => {
    const data = await api.login(username, password);

    localStorage.setItem('wb_token', data.access_token);

    const userData = {
      id: data.user.id,
      username: data.user.username,
      display_name: data.user.display_name,
    };
    localStorage.setItem('wb_user', JSON.stringify(userData));

    // Try to get private key from IndexedDB
    let privateKeyBase64 = await getPrivateKey(data.user.id);

    if (!privateKeyBase64) {
      // Try to unwrap from stored wrapped key
      const wrappedKey = localStorage.getItem('wb_wrapped_key');
      const salt = localStorage.getItem('wb_salt');

      if (wrappedKey && salt) {
        try {
          const unwrapped = await unwrapPrivateKey(wrappedKey, salt, password);
          const exported = await window.crypto.subtle.exportKey('pkcs8', unwrapped);
          privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
          await savePrivateKey(data.user.id, privateKeyBase64);
        } catch (e) {
          throw new Error('Failed to restore private key. Please register again.');
        }
      } else {
        throw new Error('Private key not found on this device. Please register again.');
      }
    }

    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try { await api.logout(); } catch (e) {}
    const userId = user?.id;
    localStorage.removeItem('wb_token');
    localStorage.removeItem('wb_user');
    if (userId) await deletePrivateKey(userId);
    setUser(null);
  };

  const getMyPrivateKey = async () => {
    if (!user) return null;
    const privateKeyBase64 = await getPrivateKey(user.id);
    if (!privateKeyBase64) return null;
    return importPrivateKey(privateKeyBase64);
  };

  const getMyPublicKey = async () => {
    if (!user) return null;
    try {
      const keyData = await api.getUserPublicKey(user.id);
      const { importPublicKey } = await import('../crypto/e2ee');
      return importPublicKey(keyData.public_key);
    } catch {
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{
      user, loading, register, login, logout, getMyPrivateKey, getMyPublicKey
    }}>
      {children}
    </AuthContext.Provider>
  );
}