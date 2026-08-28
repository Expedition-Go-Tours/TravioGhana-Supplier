import { Trash2 } from "lucide-react";
import OptimizedImage from "@/components/shared/OptimizedImage";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getOtherParticipant(conv, currentUserId) {
  const other = conv.participants?.find(
    (p) => p.userId !== currentUserId
  );
  return other?.user || conv.participants?.[0]?.user;
}

export default function ConversationList({ conversations, selectedId, onSelect, onDelete, loading, currentUserId, emptyMessage }) {
  if (loading) {
    return (
      <div className="space-y-2 px-4 py-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="h-10 w-10 rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 rounded bg-slate-200" />
              <div className="h-2.5 w-24 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
          <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="mt-3 text-sm font-medium text-slate-600">No conversations yet</p>
        <p className="mt-1 text-xs text-slate-400">{emptyMessage || "No conversations yet"}</p>
      </div>
    );
  }

  const sorted = [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div className="space-y-0.5 px-2">
      {sorted.map((conv) => {
        const otherUser = getOtherParticipant(conv, currentUserId);
        const name = otherUser?.name || conv.title || "Admin";
        const initial = name.charAt(0).toUpperCase();
        const lastMsg = conv.messages?.[0];
        const preview = lastMsg
          ? lastMsg.content.length > 50
            ? lastMsg.content.slice(0, 50) + "..."
            : lastMsg.content
          : "No messages yet";
        const isSelected = selectedId === conv.id;

        return (
          <div key={conv.id} className="group relative">
            <button
              onClick={() => onSelect(conv)}
              className={`flex w-full items-start gap-3 px-2.5 py-2 sm:px-3 sm:py-2.5 text-left rounded-xl transition-all duration-200 focus-visible:outline-none ${
                isSelected ? "bg-emerald-50 ring-1 ring-emerald-200" : "hover:bg-slate-50"
              }`}
            >
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-600 text-sm font-bold text-white">
                <span>{initial}</span>
                {otherUser?.photoURL && (
                    <OptimizedImage
                      src={otherUser.photoURL}
                      width={40}
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                )}
                {(conv.unreadCount ?? 0) > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate text-sm ${(conv.unreadCount ?? 0) > 0 ? "font-semibold text-slate-800" : isSelected ? "text-emerald-800 font-medium" : "text-slate-700 font-medium"}`}>
                    {name}
                  </p>
                  {lastMsg && (
                    <span className="shrink-0 text-[10px] text-slate-400">{timeAgo(lastMsg.createdAt)}</span>
                  )}
                </div>
                <p className={`mt-0.5 truncate text-xs ${(conv.unreadCount ?? 0) > 0 ? "font-medium text-slate-700" : "text-slate-500"}`}>{preview}</p>
              </div>
            </button>
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(conv); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all"
                title="Delete conversation"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
