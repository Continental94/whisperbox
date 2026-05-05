import { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ConversationList({ conversations, selectedUser, onSelectUser, onNewChat }) {
  const { user, logout } = useAuth();
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const data = await api.searchUsers(q);
      setSearchResults((data.users || []).filter(u => u.id !== user.id));
    } catch (err) {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectSearchResult = (u) => {
    onNewChat(u);
    setSearching(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <span className="font-semibold text-gray-800 text-sm">{user?.username}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearching(!searching)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="New chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
            <button
              onClick={logout}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
              title="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        {searching && (
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search users..."
              autoFocus
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchLoading && (
              <div className="absolute right-3 top-2.5">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
              </div>
            )}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 z-10 overflow-hidden">
                {searchResults.map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleSelectSearchResult(u)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-sm font-bold">
                      {u.username?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-800">{u.username}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-gray-500 text-sm">No conversations yet</p>
            <p className="text-gray-400 text-xs mt-1">Search for a user to start chatting</p>
          </div>
        ) : (
          conversations.map(conv => (
            <button
              key={conv.user_id}
              onClick={() => onSelectUser(conv)}
              className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 ${selectedUser?.user_id === conv.user_id ? 'bg-indigo-50' : ''}`}
            >
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold flex-shrink-0">
                {conv.username?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800 text-sm">{conv.username}</span>
                  <span className="text-xs text-gray-400">
                    {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString() : ''}
                  </span>
                </div>
                <p className="text-xs text-gray-400 truncate mt-0.5">🔒 Encrypted message</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}