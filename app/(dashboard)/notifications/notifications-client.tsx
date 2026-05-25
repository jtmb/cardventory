"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { BellIcon, ArrowRightLeftIcon, TrendingUpIcon, CheckIcon, XIcon, RefreshCwIcon, InboxIcon, SendIcon } from "lucide-react";
import { SmartCardImage } from "@/components/cards/smart-card-image";
import type { Notification } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "@/lib/date-utils";

interface TradeRequestDetails {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "denied";
  message: string | null;
  responseMessage: string | null;
  fromUserName: string | null;
  fromUserUsername: string | null;
  cardName: string | null;
  cardPhotoUrl: string | null;
  offeredCardIds: string;
  createdAt: string;
}

interface EnrichedNotification extends Notification {
  tradeRequest?: TradeRequestDetails | null;
}

type NotifTab = "all" | "trade" | "price";

function TradeRequestActions({
  requestId,
  status,
  onRespond,
}: {
  requestId: string;
  status: "pending" | "accepted" | "denied";
  onRespond: (id: string, action: "accept" | "deny") => void;
}) {
  const [responding, setResponding] = useState<"accept" | "deny" | null>(null);

  if (status !== "pending") {
    return (
      <span
        className={cn(
          "text-[11px] font-medium px-2 py-0.5 rounded-full",
          status === "accepted" && "bg-green-500/20 text-green-400",
          status === "denied" && "bg-red-500/20 text-red-400",
        )}
      >
        {status === "accepted" ? "Accepted" : "Declined"}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={async () => {
          setResponding("accept");
          await onRespond(requestId, "accept");
          setResponding(null);
        }}
        disabled={responding !== null}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-40"
      >
        {responding === "accept" ? <div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <CheckIcon className="h-3 w-3" />}
        Accept
      </button>
      <button
        onClick={async () => {
          setResponding("deny");
          await onRespond(requestId, "deny");
          setResponding(null);
        }}
        disabled={responding !== null}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-40"
      >
        {responding === "deny" ? <div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <XIcon className="h-3 w-3" />}
        Decline
      </button>
    </div>
  );
}

export function NotificationsClient() {
  const [notifications, setNotifications] = useState<EnrichedNotification[]>([]);
  const [tradeRequests, setTradeRequests] = useState<TradeRequestDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<NotifTab>("all");
  const [markingAll, setMarkingAll] = useState(false);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const fetchData = useCallback(async () => {
    try {
      const [notifRes, tradeRes] = await Promise.all([
        fetch("/api/notifications"),
        fetch("/api/trade-requests"),
      ]);
      const notifData = notifRes.ok ? (await notifRes.json() as Notification[]) : [];
      const tradeData = tradeRes.ok ? (await tradeRes.json() as TradeRequestDetails[]) : [];
      setTradeRequests(tradeData);
      // Enrich notifications with trade request data where applicable
      const enriched: EnrichedNotification[] = notifData.map((n) => {
        if (n.type === "trade_request" && n.cardId) {
          const tr = tradeData.find((t) => t.id && n.message?.includes(t.id)) ?? null;
          return { ...n, tradeRequest: tr };
        }
        return n;
      });
      setNotifications(enriched);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setMarkingAll(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: unreadIds }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  }

  async function markOneRead(id: string) {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    } catch {
      // ignore
    }
  }

  async function handleTradeRespond(requestId: string, action: "accept" | "deny") {
    try {
      const res = await fetch(`/api/trade-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setTradeRequests((prev) => prev.map((t) => t.id === requestId ? { ...t, status: action === "accept" ? "accepted" : "denied" } : t));
        await fetchData();
      }
    } catch {
      // ignore
    }
  }

  // Incoming pending trade requests (sent TO me)
  const incomingPending = tradeRequests.filter(
    (t) => t.toUserId === currentUserId && t.status === "pending"
  );

  // Sent trade requests (sent BY me)
  const sentRequests = tradeRequests.filter(
    (t) => t.fromUserId === currentUserId
  );

  const filteredNotifications = notifications.filter((n) => {
    if (tab === "trade") return n.type === "trade_request";
    if (tab === "price") return n.type !== "trade_request";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <BellIcon className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="min-w-[22px] h-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold px-1.5">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCwIcon className="h-3.5 w-3.5" />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 transition-colors disabled:opacity-40"
            >
              {markingAll ? <div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <CheckIcon className="h-3 w-3" />}
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Incoming pending trade requests banner */}
      {incomingPending.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid oklch(0.35 0.12 260 / 0.5)", background: "oklch(0.16 0.05 260 / 0.6)" }}>
          <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: "1px solid oklch(0.25 0.06 260 / 0.4)" }}>
            <ArrowRightLeftIcon className="h-3.5 w-3.5 shrink-0" style={{ color: "oklch(0.65 0.18 260)" }} />
            <p className="text-xs font-semibold" style={{ color: "oklch(0.70 0.1 260)" }}>
              {incomingPending.length} pending trade request{incomingPending.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: "oklch(0.22 0.05 260 / 0.4)" }}>
            {incomingPending.map((req) => (
              <div key={req.id} className="px-4 py-3 flex items-start gap-3">
                {req.cardPhotoUrl && (
                  <div className="w-10 aspect-[5/7] rounded-lg overflow-hidden shrink-0 bg-muted">
                    <SmartCardImage src={req.cardPhotoUrl} alt={req.cardName ?? ""} unoptimized={req.cardPhotoUrl.startsWith("http")} />
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium" style={{ color: "oklch(0.85 0.02 260)" }}>
                    <span style={{ color: "oklch(0.65 0.15 260)" }}>{req.fromUserName ?? "Someone"}</span>
                    {req.fromUserUsername && <span className="text-xs ml-1" style={{ color: "oklch(0.45 0.05 260)" }}>@{req.fromUserUsername}</span>}
                    {" "}wants your <strong>{req.cardName}</strong>
                  </p>
                  {req.message && (
                    <p className="text-xs italic" style={{ color: "oklch(0.55 0.04 260)" }}>&ldquo;{req.message}&rdquo;</p>
                  )}
                  {(() => {
                    let offeredIds: string[] = [];
                    try { offeredIds = JSON.parse(req.offeredCardIds ?? "[]"); } catch {}
                    return offeredIds.length > 0 ? (
                      <p className="text-xs" style={{ color: "oklch(0.50 0.04 260)" }}>Offering {offeredIds.length} card{offeredIds.length !== 1 ? "s" : ""}</p>
                    ) : (
                      <p className="text-xs" style={{ color: "oklch(0.45 0.04 260)" }}>No specific cards offered</p>
                    );
                  })()}
                  <div className="pt-1">
                    <TradeRequestActions requestId={req.id} status={req.status} onRespond={handleTradeRespond} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sent trade requests */}
      {sentRequests.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid oklch(0.35 0.08 260 / 0.4)", background: "oklch(0.14 0.03 260 / 0.5)" }}>
          <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: "1px solid oklch(0.22 0.04 260 / 0.4)" }}>
            <SendIcon className="h-3.5 w-3.5 shrink-0" style={{ color: "oklch(0.60 0.12 260)" }} />
            <p className="text-xs font-semibold" style={{ color: "oklch(0.62 0.08 260)" }}>
              Sent Requests
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: "oklch(0.20 0.04 260 / 0.4)" }}>
            {sentRequests.map((req) => (
              <div key={req.id} className="px-4 py-3 flex items-start gap-3">
                {req.cardPhotoUrl && (
                  <div className="w-10 aspect-[5/7] rounded-lg overflow-hidden shrink-0 bg-muted">
                    <SmartCardImage src={req.cardPhotoUrl} alt={req.cardName ?? ""} unoptimized={req.cardPhotoUrl.startsWith("http")} />
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium" style={{ color: "oklch(0.80 0.02 260)" }}>
                    Your request for <strong>{req.cardName}</strong>
                  </p>
                  {req.message && (
                    <p className="text-xs italic" style={{ color: "oklch(0.50 0.03 260)" }}>&ldquo;{req.message}&rdquo;</p>
                  )}
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className={cn(
                      "text-[11px] font-medium px-2 py-0.5 rounded-full",
                      req.status === "pending" && "bg-amber-500/15 text-amber-400",
                      req.status === "accepted" && "bg-green-500/20 text-green-400",
                      req.status === "denied" && "bg-red-500/20 text-red-400",
                    )}>
                      {req.status === "pending" ? "Awaiting response" : req.status === "accepted" ? "Accepted" : "Declined"}
                    </span>
                    <span className="text-[11px]" style={{ color: "oklch(0.40 0.03 260)" }}>
                      {formatDistanceToNow(new Date(req.createdAt))}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1">
        {(["all", "trade", "price"] as NotifTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize",
              tab === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {t === "all" ? "All" : t === "trade" ? "Trade Requests" : "Price Alerts"}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <InboxIcon className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => { if (!notif.read) markOneRead(notif.id); }}
              className={cn(
                "relative flex items-start gap-3 px-4 py-3 rounded-xl border transition-colors cursor-pointer",
                notif.read
                  ? "border-border/40 bg-card/50 hover:bg-card"
                  : "border-primary/20 bg-primary/5 hover:bg-primary/8"
              )}
            >
              {/* Unread dot */}
              {!notif.read && (
                <div className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-primary shrink-0" />
              )}

              {/* Icon */}
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mt-0.5",
                notif.type === "trade_request" ? "bg-blue-500/15" : "bg-green-500/15"
              )}>
                {notif.type === "trade_request" ? (
                  <ArrowRightLeftIcon className="h-4 w-4 text-blue-400" />
                ) : (
                  <TrendingUpIcon className="h-4 w-4 text-green-400" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm leading-snug" style={{ color: notif.read ? "oklch(0.55 0.02 260)" : "oklch(0.85 0.02 260)" }}>
                  {notif.message}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(notif.createdAt instanceof Date ? notif.createdAt : new Date(notif.createdAt))}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
