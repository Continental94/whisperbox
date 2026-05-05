WhisperBox — E2EE Messaging App

A secure end-to-end encrypted messaging application where the server never sees plaintext.

🔗 Live Demo
[View Live App](YOUR_VERCEL_URL_HERE)

🔐 Encryption Architecture

Message Flow:

Sender generates AES-GCM 256-bit key per message
Message encrypted with AES-GCM key
AES key encrypted with recipient's RSA-OAEP public key
AES key also encrypted with sender's RSA-OAEP public key
Only ciphertext sent to server
Recipient decrypts AES key with their private key
AES key decrypts the message

🔑 Key Management

- RSA-OAEP 2048-bit key pairs generated on registration
- Public key stored on server
- Private key NEVER leaves the device
- Private key stored in IndexedDB (encrypted with password via PBKDF2 + AES-GCM)
- Password-derived key uses 100,000 PBKDF2 iterations

🛠️ Tech Stack
- React + Vite
- Web Crypto API (built-in browser crypto)
- IndexedDB (private key storage)
- Tailwind CSS
- WhisperBox API backend

🚀 Setup Instructions

```bash
git clone https://github.com/Continental94/whisperbox.git
cd whisperbox
npm install
npm run dev
```

Open http://localhost:5173

🏗️ Architecture

src/
├── crypto/e2ee.js          ← All encryption logic
├── db/keyStore.js          ← IndexedDB private key storage
├── api/client.js           ← API communication layer
├── context/AuthContext.jsx ← Auth + key management
├── pages/
│   ├── Register.jsx        ← Registration + key generation
│   ├── Login.jsx           ← Login + key recovery
│   └── Chat.jsx            ← Main messaging interface
└── components/
├── ConversationList.jsx ← Sidebar with conversations
├── MessageThread.jsx    ← Message display
├── MessageInput.jsx     ← Message composition
└── EncryptedBadge.jsx  ← E2EE indicator

🛡️ Security Decisions
- Web Crypto API used — no third-party crypto libraries
- Private keys stored in IndexedDB, never in localStorage
- Private key wrapped with AES-GCM + PBKDF2 (100k iterations)
- Server stores only encrypted blobs
- JWT tokens for session management
- All API calls over HTTPS

⚖️ Trade-offs
- Private key is device-specific — logging in on a new device requires re-registration
- No perfect forward secrecy (future improvement)
- No message deletion from server
- Single device per user limitation

⚠️ Known Limitations
- Private keys tied to device/browser
- No push notifications
- No file/image sharing
- No group messaging