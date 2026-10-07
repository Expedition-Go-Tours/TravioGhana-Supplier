import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import StaysSurface from "../components/StaysSurface";
import StaysPageHeader from "../components/StaysPageHeader";
import StaysCard from "../components/StaysCard";
import StaysSeg from "../components/StaysSeg";
import StaysButton from "../components/StaysButton";
import StaysPill from "../components/StaysPill";
import StaysEmptyState from "../components/StaysEmptyState";
import { StaysTextarea } from "../components/StaysForm";
import { listGuestMessages, replyToGuestMessage, STAYS_KEYS } from "../api";

/**
 * Guest messages — the Stays workspace's own inbox for questions guests send
 * about a property. Separate from the Experiences chat: it reads the supplier
 * messages endpoint (mock-backed today) and replies in place, so the two
 * workspaces never share a conversation list.
 *
 * Filters match the API: All · Unread (no reply) · Replied.
 */
export default function StaysMessagesPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("All");
  const [openId, setOpenId] = useState(null);
  const [drafts, setDrafts] = useState({});

  const { data: messages = [], isLoading } = useQuery({
    queryKey: STAYS_KEYS.messages(filter),
    queryFn: () => listGuestMessages({ filter }),
    staleTime: 20_000,
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, reply }) => replyToGuestMessage(id, reply),
    onSuccess: (_message, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stays", "messages"] });
      queryClient.invalidateQueries({ queryKey: STAYS_KEYS.dashboard });
      setDrafts((current) => ({ ...current, [variables.id]: "" }));
      setOpenId(null);
      toast.success("Reply sent");
    },
    onError: () => toast.error("Could not send the reply"),
  });

  const send = (message) => {
    const reply = (drafts[message.id] || "").trim();
    if (!reply || replyMutation.isPending) return;
    replyMutation.mutate({ id: message.id, reply });
  };

  return (
    <StaysSurface>
      <StaysPageHeader
        title="Guest messages"
        subtitle="Questions guests send about your properties — reply in one place."
      />

      <StaysSeg
        className="mb-4"
        ariaLabel="Filter messages"
        options={["All", "Unread", "Replied"].map((status) => ({ value: status, label: status }))}
        value={filter}
        onChange={setFilter}
      />

      {isLoading ? (
        <StaysCard className="min-h-[200px] animate-pulse bg-white/60" />
      ) : messages.length ? (
        <div className="grid grid-cols-1 gap-[14px]">
          {messages.map((message) => {
            const replied = Boolean(message.reply);
            const replying = openId === message.id;
            return (
              <StaysCard key={message.id} data-message-card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm font-semibold text-slate-800">
                        {message.guest}
                      </strong>
                      <span className="text-xs text-slate-400">{message.date}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{message.text}</p>
                  </div>
                  <StaysPill tone={replied ? "green" : "amber"}>
                    {replied ? "Replied" : "Unread"}
                  </StaysPill>
                </div>

                {replied ? (
                  <div className="mt-3 rounded-lg bg-emerald-50/60 px-3.5 py-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                      Your reply
                    </span>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{message.reply}</p>
                  </div>
                ) : replying ? (
                  <div className="mt-3 space-y-2.5">
                    <StaysTextarea
                      aria-label={`Reply to ${message.guest}`}
                      rows={3}
                      placeholder="Write a reply…"
                      value={drafts[message.id] || ""}
                      onChange={(event) =>
                        setDrafts((current) => ({ ...current, [message.id]: event.target.value }))
                      }
                    />
                    <div className="flex flex-wrap gap-2.5">
                      <StaysButton
                        variant="primary"
                        size="small"
                        disabled={replyMutation.isPending}
                        onClick={() => send(message)}
                      >
                        Send reply
                      </StaysButton>
                      <StaysButton size="small" onClick={() => setOpenId(null)}>
                        Cancel
                      </StaysButton>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <StaysButton size="small" onClick={() => setOpenId(message.id)}>
                      Reply
                    </StaysButton>
                  </div>
                )}
              </StaysCard>
            );
          })}
        </div>
      ) : (
        <StaysCard>
          <StaysEmptyState title="No messages in this view">
            Guest questions appear here as soon as they arrive.
          </StaysEmptyState>
        </StaysCard>
      )}
    </StaysSurface>
  );
}
