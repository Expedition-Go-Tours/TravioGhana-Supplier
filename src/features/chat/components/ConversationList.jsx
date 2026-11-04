import { Trash2, MessageSquare } from "lucide-react";
import OptimizedImage from "@/components/shared/OptimizedImage";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (Number.isNaN(diff)) return "";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getOtherParticipant(conv, currentUserId) {
  // The thread's customer, not merely "anyone who isn't me": a supplier
  // colleague who replied by email is a third participant, so the naive rule
  // renamed the row after her instead of after the customer.
  const other = conv.customerUserId
    ? conv.participants?.find((p) => p.userId === conv.customerUserId)
    : conv.participants?.find(
        (p) => p.userId !== currentUserId
      );
  return other?.user || conv.participants?.[0]?.user;
}

export default function ConversationList({ conversations, selectedId, onSelect, onDelete, loading, currentUserId, emptyMessage }) {
  if (loading) {
    return (
      <div className="space-y-1 px-2 py-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-2.5">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-100" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
              <div className="h-2.5 w-40 animate-pulse rounded bg-slate-50" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <MessageSquare size={18} />
        </div>
        <p className="mt-3 text-sm font-medium text-slate-700">No conversations</p>
        <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-slate-400">
          {emptyMessage || "Customer conversations will appear here."}
        </p>
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
        const preview = lastMsg?.content || "No messages yet";
        const isSelected = selectedId === conv.id;
        const unread = (conv.unreadCount ?? 0) > 0;

        return (
          <div key={conv.id} className="group relative">
            <button
              onClick={() => onSelect(conv)}
              className={`flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 ${
                isSelected ? "bg-emerald-50 ring-1 ring-emerald-100" : "hover:bg-slate-50"
              }`}
            >
              <div className="relative h-9 w-9 shrink-0">
                <div className={`relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-emerald-700 text-xs font-bold text-white ${unread ? "ring-2 ring-emerald-200 ring-offset-1" : ""}`}>
                  <span>{initial}</span>
                  {otherUser?.photoURL && (
                    <OptimizedImage
                      src={otherUser.photoURL}
                      width={36}
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  )}
                </div>
                {unread && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={`truncate text-[13px] leading-tight ${unread ? "font-semibold text-slate-900" : isSelected ? "font-medium text-emerald-800" : "font-medium text-slate-700"}`}>
                    {name}
                  </p>
                  {lastMsg && (
                    <span className="shrink-0 text-[10px] tabular-nums text-slate-400">
                      {timeAgo(lastMsg.createdAt)}
                    </span>
                  )}
                </div>
                <p className={`mt-1 truncate text-xs leading-tight ${unread ? "font-medium text-slate-600" : "text-slate-400"}`}>
                  {preview}
                </p>
              </div>
            </button>
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(conv); }}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-slate-300 opacity-0 shadow-sm transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100 focus-visible:opacity-100"
                title="Delete conversation"
                aria-label={`Delete conversation with ${name}`}
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
