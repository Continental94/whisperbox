import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import EncryptedBadge from './EncryptedBadge';

export default function MessageThread({ messages, selectedUser, loading }) {
  const { user } = useAuth();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!selectedUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-center p-6">
        <div className="text-6xl mb-4">🔐</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">WhisperBox</h2>
        <p className="text-gray-500 text-sm max-w-xs">
          Select a conversation or search for a user to start sending encrypted messages
        </p>
        <div className="mt-6">
          <EncryptedBadge />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
            {selectedUser.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-800">{selectedUser.username}</p>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <span>🔒</span> Messages are end-to-end encrypted
            </p>
          </div>
        </div>
        <EncryptedBadge />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-gray-400 text-sm">No messages yet</p>
            <p className="text-gray-300 text-xs mt-1">Send a message to start the conversation</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMine = msg.sender_id === user.id;
            return (
              <div key={msg.id || index} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2.5 rounded-2xl text-sm ${
                  isMine
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
                }`}>
                  <p className="leading-relaxed break-words">{msg.decryptedContent}</p>
                  <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <span className={`text-xs ${isMine ? 'text-indigo-200' : 'text-gray-400'}`}>
                      {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                    <span className={`text-xs ${isMine ? 'text-indigo-200' : 'text-green-500'}`}>🔒</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}