export default function EncryptedBadge() {
  return (
    <div className="flex items-center justify-center gap-1.5 py-2 px-3 bg-green-50 border border-green-200 rounded-full text-xs text-green-700 font-medium">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
      End-to-end encrypted
    </div>
  );
}