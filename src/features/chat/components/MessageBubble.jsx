import { Check, CheckCheck, Loader2 } from "lucide-react";
import OptimizedImage from "@/components/shared/OptimizedImage";

function formatMessageTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

const statusIcon = {
  sending: <Loader2 className="h-3 w-3 animate-spin" />,
  sent: <Check className="h-3 w-3" />,
  delivered: <CheckCheck className="h-3 w-3" />,
  read: <CheckCheck className="h-3 w-3 text-emerald-400" />,
};

export default function MessageBubble({ message, isOwn, status, showAvatar, senderAvatar, senderName, compact, avatarIcon }) {
  const a = compact ? "h-6 w-6 text-[9px] mt-0" : "h-8 w-8 text-xs mt-1";
  const spacer = compact ? "w-6" : "w-8";
  const bubblePad = compact ? "px-2.5 py-1.5" : "px-3.5 py-2";
  const bubbleText = compact ? "text-xs leading-snug" : "text-sm leading-relaxed";
  const bubbleRadius = compact ? "rounded-[14px]" : "rounded-[18px]";
  const bubbleRadiusOwn = compact ? "rounded-br-[3px]" : "rounded-br-[4px]";
  const bubbleRadiusOther = compact ? "rounded-bl-[3px]" : "rounded-bl-[4px]";
  const attMargin = compact ? "-mx-2.5 -mt-1.5 mb-1.5" : "-mx-3.5 -mt-2 mb-2";
  const attRadius = compact ? "rounded-t-[14px]" : "rounded-t-[18px]";
  const tsSize = compact ? "text-[9px]" : "text-[10px]";
  const maxW = compact ? "max-w-[72%]" : "max-w-[65%]";
  const avatarColor = "bg-emerald-600";

  return (
      <div className={`flex gap-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
      {showAvatar ? (
        <div className={`relative flex ${a} shrink-0 items-center justify-center overflow-hidden rounded-full ${avatarColor} font-bold text-white self-end -mb-0.5`}>
          {avatarIcon ? (
            avatarIcon
          ) : senderAvatar ? (
            <OptimizedImage
              src={senderAvatar}
              alt=""
              width={compact ? 24 : 32}
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          ) : (
            <span className={compact ? "text-[9px]" : "text-xs"}>{senderName?.charAt(0)?.toUpperCase() || "?"}</span>
          )}
        </div>
      ) : (
        <div className={`${spacer} shrink-0`} />
      )}

      <div className={`flex ${maxW} min-w-0 flex-col ${isOwn ? "items-end" : "items-start"}`}>
        <div
          className={`relative ${bubblePad} ${bubbleText} shadow-sm ${
            isOwn
              ? `bg-emerald-600 text-white ${bubbleRadius} ${bubbleRadiusOwn}`
              : `bg-white text-slate-800 border border-slate-200 ${bubbleRadius} ${bubbleRadiusOther}`
          }`}>
          {message.attachmentUrl && (
            <div className={`${attMargin} overflow-hidden ${attRadius}`}>
              <OptimizedImage
                src={message.attachmentUrl}
                alt=""
                width={600}
                fit="fill"
                className="max-w-full object-cover"
                onError={(e) => { e.target.style.display = "none"; }}
              />
            </div>
          )}
          {message.content && (
            <span className="whitespace-pre-wrap" style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>{message.content}</span>
          )}
          <div className={`mt-0.5 flex items-center gap-1 ${isOwn ? "justify-end" : "justify-start"}`}>
            <span className={`${tsSize} leading-none ${isOwn ? "text-white/70" : "text-slate-400"}`}>
              {formatMessageTime(message.createdAt)}
            </span>
            {isOwn && status && <span className="flex">{statusIcon[status]}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
