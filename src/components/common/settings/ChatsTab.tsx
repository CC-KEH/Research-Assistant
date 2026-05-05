import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Trash2,
  MessageSquare,
  Clock,
  Tag,
  ChevronDown,
  ChevronUp,
  Search,
  RotateCcw,
} from "lucide-react";
import { formatDate } from "@/lib/backend";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import type { ChatMessage, ChatSession } from "@/lib/types";
import { useChats } from "@/components/providers/ConfigProvider";

export default function ChatsTab() {
  const {
    chats,
    chatsLoading,
    reloadChats,
    sessions: contextSessions,
    removeChatSession,
    updateChatSession,
  } = useChats();

  const [search, setSearch] = useState("");
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const deleteTimeoutRef = useRef<number | null>(null);

  // Clear the pending confirm-delete timeout on unmount.
  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current !== null) {
        window.clearTimeout(deleteTimeoutRef.current);
      }
    };
  }, []);

  const sessions = useMemo(() => contextSessions ?? [], [contextSessions]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s: ChatSession) =>
        s.name.toLowerCase().includes(q) ||
        s.metadata?.context?.toLowerCase().includes(q) ||
        s.metadata?.tags?.some((t) => t.toLowerCase().includes(q)),
    );
  }, [sessions, search]);

  const handleRename = useCallback((session: ChatSession) => {
    setEditingName(session.name);
    setEditNameValue(session.name);
  }, []);

  const handleRenameConfirm = useCallback(
    (oldName: string) => {
      const session = sessions.find((s) => s.name === oldName);
      if (!session || !editNameValue.trim()) return;
      updateChatSession(oldName, {
        ...session,
        name: editNameValue.trim(),
        metadata: {
          ...session.metadata,
          last_updated: new Date().toISOString(),
        },
      });
      setEditingName(null);
    },
    [sessions, editNameValue, updateChatSession],
  );

  const handleDelete = useCallback(
    (name: string) => {
      if (confirmDelete === name) {
        // Confirmed — clear any pending timer and delete.
        if (deleteTimeoutRef.current !== null) {
          window.clearTimeout(deleteTimeoutRef.current);
          deleteTimeoutRef.current = null;
        }
        removeChatSession(name);
        setConfirmDelete(null);
      } else {
        if (deleteTimeoutRef.current !== null) {
          window.clearTimeout(deleteTimeoutRef.current);
        }
        setConfirmDelete(name);
        deleteTimeoutRef.current = window.setTimeout(() => {
          setConfirmDelete(null);
          deleteTimeoutRef.current = null;
        }, 3000);
      }
    },
    [confirmDelete, removeChatSession],
  );

  const totalMessages = useMemo(
    () =>
      sessions.reduce(
        (acc: number, s: ChatSession) =>
          acc + (s.metadata?.total_messages ?? 0),
        0,
      ),
    [sessions],
  );

  if (chatsLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        Loading chats...
      </div>
    );
  }

  if (!chats) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <MessageSquare className="w-8 h-8 opacity-40" />
        <p className="text-sm">No chats file loaded.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 px-4 py-6">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, context or tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={reloadChats}
        >
          <RotateCcw className="w-3 h-3" />
          Reload
        </Button>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 text-xs text-muted-foreground border rounded-lg px-4 py-2.5 bg-muted/30">
        <span>
          <span className="font-semibold text-foreground">
            {sessions.length}
          </span>{" "}
          total sessions
        </span>
        <span>
          <span className="font-semibold text-foreground">{totalMessages}</span>{" "}
          total messages
        </span>
        {search && (
          <span className="ml-auto">
            Showing{" "}
            <span className="font-semibold text-foreground">
              {filtered.length}
            </span>{" "}
            results
          </span>
        )}
      </div>

      {/* Session list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
          <MessageSquare className="w-7 h-7 opacity-30" />
          <p className="text-sm">No sessions found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((session: ChatSession) => {
            const isExpanded = expandedSession === session.name;
            const isEditingThis = editingName === session.name;
            const isConfirmingDelete = confirmDelete === session.name;

            return (
              <Card
                key={session.name}
                className="shadow-sm rounded-xl w-full overflow-hidden transition-all duration-200"
              >
                <CardContent className="px-4 py-3 space-y-0">
                  {/* Top row */}
                  <div className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <MessageSquare className="w-4 h-4 shrink-0 text-muted-foreground" />

                      {isEditingThis ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editNameValue}
                            onChange={(e) => setEditNameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleRenameConfirm(session.name);
                              if (e.key === "Escape") setEditingName(null);
                            }}
                            className="h-7 text-sm flex-1"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => handleRenameConfirm(session.name)}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2"
                            onClick={() => setEditingName(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <button
                          className="text-sm font-medium truncate hover:underline text-left"
                          onClick={() => handleRename(session)}
                          title="Click to rename"
                        >
                          {session.name || (
                            <span className="italic text-muted-foreground">
                              Untitled
                            </span>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-muted-foreground mr-1">
                        {session.metadata?.total_messages ??
                          session.history?.length ??
                          0}{" "}
                        msgs
                      </span>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() =>
                          setExpandedSession(isExpanded ? null : session.name)
                        }
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 w-7 p-0 transition-colors ${
                          isConfirmingDelete
                            ? "text-destructive bg-destructive/10 hover:bg-destructive/20"
                            : "text-muted-foreground hover:text-destructive"
                        }`}
                        onClick={() => handleDelete(session.name)}
                        title={
                          isConfirmingDelete
                            ? "Click again to confirm"
                            : "Delete session"
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Collapsed meta row */}
                  {!isExpanded && (
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground pl-6">
                      {session.metadata?.last_updated && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(session.metadata.last_updated)}
                        </span>
                      )}
                      {(session.metadata?.tags?.length ?? 0) > 0 && (
                        <span className="flex items-center gap-1 truncate">
                          <Tag className="w-3 h-3 shrink-0" />
                          {session.metadata!.tags!.slice(0, 3).join(", ")}
                          {session.metadata!.tags!.length > 3 && " …"}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-3 pl-6 space-y-3 border-t pt-3">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                        <div>
                          <p className="text-muted-foreground mb-0.5">
                            Created
                          </p>
                          <p className="font-medium">
                            {formatDate(session.metadata?.created_at)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-0.5">
                            Last updated
                          </p>
                          <p className="font-medium">
                            {formatDate(session.metadata?.last_updated)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-0.5">
                            Messages
                          </p>
                          <p className="font-medium">
                            {session.metadata?.total_messages ??
                              session.history?.length ??
                              0}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-0.5">Tags</p>
                          <p className="font-medium">
                            {session.metadata?.tags?.length
                              ? session.metadata.tags.join(", ")
                              : "—"}
                          </p>
                        </div>
                      </div>

                      {session.metadata?.context && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Context
                          </p>
                          <p className="text-xs bg-muted/40 rounded-md px-3 py-2 leading-relaxed">
                            {session.metadata.context}
                          </p>
                        </div>
                      )}

                      {/* Last few messages preview */}
                      {(session.history?.length ?? 0) > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1.5">
                            Recent messages
                          </p>
                          <div className="space-y-1.5">
                            {/* FIX: use msg.index as key instead of array index i */}
                            {session
                              .history!.slice(-3)
                              .map((msg: ChatMessage) => (
                                <div
                                  key={msg.index}
                                  className={`text-xs rounded-md px-3 py-1.5 ${
                                    msg.is_ai
                                      ? "bg-primary/8 text-foreground"
                                      : "bg-muted/50 text-muted-foreground"
                                  }`}
                                >
                                  <span className="font-medium mr-1.5">
                                    {msg.is_ai ? "AI" : "You"}:
                                  </span>
                                  <span className="line-clamp-2">
                                    {msg.message}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {isConfirmingDelete && (
                        <p className="text-xs text-destructive font-medium animate-pulse">
                          Click delete again to confirm removal of this session.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
