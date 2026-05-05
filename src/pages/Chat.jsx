import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { encryptMessage, decryptMessage, importPublicKey } from '../crypto/e2ee';
import ConversationList from '../components/ConversationList';
import MessageThread from '../components/MessageThread';
import MessageInput from '../components/MessageInput';

export default function Chat() {
  const { user, loading, getMyPrivateKey, getMyPublicKey } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) loadConversations();
  }, [user]);

  const loadConversations = async () => {
    try {
      const data = await api.getConversations();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const loadMessages = useCallback(async (otherUser) => {
    setMessagesLoading(true);
    setMessages([]);
    setError('');
    try {
      const data = await api.getMessages(otherUser.user_id || otherUser.id);
      const privateKey = await getMyPrivateKey();
      if (!privateKey) {
        setError('Private key not found. Please re-register.');
        return;
      }
      const decrypted = await Promise.all(
        (data.messages || []).map(async (msg) => {
          try {
            let encryptedData;
            if (typeof msg.encrypted_message === 'string') {
              try { encryptedData = JSON.parse(msg.encrypted_message); }
              catch { encryptedData = { encryptedMessage: msg.encrypted_message, encryptedKey: msg.encrypted_key, encryptedKeySender: msg.encrypted_key_sender, iv: msg.iv }; }
            } else {
              encryptedData = msg.encrypted_message;
            }
            const decryptedContent = await decryptMessage(encryptedData, privateKey);
            return { ...msg, decryptedContent };
          } catch {
            return { ...msg, decryptedContent: '🔒 [Encrypted message]' };
          }
        })
      );
      setMessages(decrypted);
    } catch (err) {
      setError('Failed to load messages: ' + err.message);
    } finally {
      setMessagesLoading(false);
    }
  }, [getMyPrivateKey]);

  const handleSelectUser = (conv) => {
    setSelectedUser(conv);
    loadMessages(conv);
  };

  const handleNewChat = (u) => {
    setSelectedUser({ user_id: u.id, username: u.username });
    setMessages([]);
  };

  const handleSendMessage = async (plaintext) => {
    if (!selectedUser) return;
    setError('');
    try {
      const recipientId = selectedUser.user_id || selectedUser.id;
      const recipientKeyData = await api.getUserPublicKey(recipientId);
      const recipientPublicKey = await importPublicKey(recipientKeyData.public_key);
      const senderPublicKey = await getMyPublicKey();
      const encrypted = await encryptMessage(plaintext, recipientPublicKey, senderPublicKey);
      await api.sendMessage(
        recipientId,
        JSON.stringify(encrypted),
        encrypted.encryptedKey,
        encrypted.encryptedKeySender,
        encrypted.iv
      );
      const newMsg = {
        id: Date.now(),
        sender_id: user.id,
        recipient_id: recipientId,
        decryptedContent: plaintext,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, newMsg]);
      loadConversations();
    } catch (err) {
      setError('Failed to send: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-white overflow-hidden">
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-2 hover:opacity-70">✕</button>
        </div>
      )}
      <div className="w-80 flex-shrink-0 border-r border-gray-100">
        <ConversationList
          conversations={conversations}
          selectedUser={selectedUser}
          onSelectUser={handleSelectUser}
          onNewChat={handleNewChat}
        />
      </div>
      <div className="flex-1 flex flex-col">
        <MessageThread
          messages={messages}
          selectedUser={selectedUser}
          loading={messagesLoading}
        />
        {selectedUser && (
          <MessageInput
            onSend={handleSendMessage}
            disabled={messagesLoading}
          />
        )}
      </div>
    </div>
  );
}