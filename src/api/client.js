const BASE_URL = 'https://whisperbox.koyeb.app';

function getToken() {
  return localStorage.getItem('wb_token');
}

async function request(method, path, body = null, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await res.json();

  if (!res.ok) {
    let errorMessage = 'Request failed';
    if (typeof data.message === 'string') {
      errorMessage = data.message;
    } else if (typeof data.detail === 'string') {
      errorMessage = data.detail;
    } else if (Array.isArray(data.detail)) {
      errorMessage = data.detail.map(e => e.msg || e.message || JSON.stringify(e)).join(', ');
    } else if (Array.isArray(data.message)) {
      errorMessage = data.message.map(e => e.msg || e.message || JSON.stringify(e)).join(', ');
    }
    throw new Error(errorMessage);
  }

  return data;
}

export const api = {
  register: (username, displayName, password, publicKey, wrappedPrivateKey, pbkdf2Salt) =>
    request('POST', '/auth/register', {
      username,
      display_name: displayName,
      password,
      public_key: publicKey,
      wrapped_private_key: wrappedPrivateKey,
      pbkdf2_salt: pbkdf2Salt,
    }, false),

  login: (username, password) =>
    request('POST', '/auth/login', { username, password }, false),

  logout: () => request('POST', '/auth/logout'),

  me: () => request('GET', '/auth/me'),

  searchUsers: (query) =>
    request('GET', `/users/search?q=${encodeURIComponent(query)}`),

  getUserPublicKey: (userId) =>
    request('GET', `/users/${userId}/public-key`),

  getConversations: () =>
    request('GET', '/messages/conversations'),

  getMessages: (userId) =>
    request('GET', `/messages/${userId}`),

  sendMessage: (recipientId, encryptedMessage, encryptedKey, encryptedKeySender, iv) =>
    request('POST', '/messages', {
      recipient_id: recipientId,
      encrypted_message: encryptedMessage,
      encrypted_key: encryptedKey,
      encrypted_key_sender: encryptedKeySender,
      iv,
    }),
};