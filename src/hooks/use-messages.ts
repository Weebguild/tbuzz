import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  status?: "sending" | "sent" | "error";
  error_message?: string;
}

const PAGE_SIZE = 50;

export function useMessages(conversationId: string | undefined) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMessages = useCallback(async (loadMore = false) => {
    if (!conversationId) return;

    if (loadMore) {
      if (loadingMore || !hasMore) return;
      setLoadingMore(true);
    } else {
      setLoading(true);
      setMessages([]);
    }

    const currentLength = loadMore ? messages.length : 0;
    
    const { data: fetchResult, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .range(currentLength, currentLength + PAGE_SIZE - 1);

    if (!error && fetchResult) {
      // Reverse because we fetch descending (newest first) but render ascending (oldest first at top)
      const formattedData = (fetchResult as Message[]).reverse();
      
      setMessages((prev) => {
        if (loadMore) {
          // Prepend older messages
          return [...formattedData, ...prev];
        }
        return formattedData;
      });
      setHasMore(fetchResult.length === PAGE_SIZE);
    }
    
    if (loadMore) {
      setLoadingMore(false);
    } else {
      setLoading(false);
    }
  }, [conversationId, messages.length, loadingMore, hasMore]);

  // Mark unread messages as read
  const markAsRead = useCallback(async () => {
    if (!conversationId || !user) return;
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .eq("is_read", false);
  }, [conversationId, user]);

  useEffect(() => {
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Broadcast typing status
  const setTyping = useCallback((typing: boolean) => {
    if (!conversationId || !channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: user?.id, isTyping: typing },
    });
  }, [conversationId, user]);

  const handleInputChange = useCallback(() => {
    setTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 3000);
  }, [setTyping]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Update if optimistic insert already added it
            if (prev.some((m) => m.id === newMsg.id)) {
              return prev.map(m => m.id === newMsg.id ? { ...newMsg, status: "sent" } : m);
            }
            return [...prev, { ...newMsg, status: "sent" }];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedMsg = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMsg.id ? { ...updatedMsg, status: m.status || "sent" } : m))
          );
        }
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload.userId !== user?.id) {
          setIsTyping(payload.payload.isTyping);
        }
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId, user]);

  const sendMessage = useCallback(
    async (content: string, file?: File, type: "text" | "image" | "video" | "audio" | "file" = "text") => {
      if (!conversationId || !user || (!content.trim() && !file)) return;
      setTyping(false);

      let finalContent = content.trim();

      // OPTIMISTIC UPDATE
      const tempId = crypto.randomUUID();
      const optimisticMsg: Message = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: user.id,
        content: finalContent,
        created_at: new Date().toISOString(),
        is_read: false,
        status: "sending"
      };

      if (!file) {
        setMessages(prev => [...prev, optimisticMsg]);
      } else {
        // If file, we wait for upload before optimistic UI to handle correct media URL,
        // or we use local preview url. Using local preview is complex for now,
        // so we just show regular sending without image preview in the chat line,
        // then actual upload.
        optimisticMsg.content = JSON.stringify({ type, url: URL.createObjectURL(file), text: content.trim() || undefined, isLocal: true });
        setMessages(prev => [...prev, optimisticMsg]);
      }

      try {
        if (file) {
          const ext = file.name.split(".").pop();
          const path = `${user.id}/${Date.now()}.${ext}`;
          const bucket = "post-images";

          const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file);
          if (uploadError) {
            console.error("Upload error:", uploadError);
            throw uploadError;
          }

          const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(path);
          finalContent = JSON.stringify({
            type,
            url: publicUrl.publicUrl,
            text: content.trim() || undefined,
            fileName: file.name,
            fileSize: file.size,
          });
        }

        const { error } = await supabase.from("messages").insert({
          id: tempId,
          conversation_id: conversationId,
          sender_id: user.id,
          content: finalContent,
        });

        if (error) {
          console.error("Failed to send message:", error);
          throw error;
        }
        
      } catch (err) {
        // Handle failure: mark as error
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "error", error_message: "Failed to send" } : m));
      }
    },
    [conversationId, user, setTyping]
  );

  const loadMoreMessages = useCallback(() => {
    fetchMessages(true);
  }, [fetchMessages]);

  return { messages, loading, loadingMore, hasMore, loadMoreMessages, sendMessage, markAsRead, isTyping, handleInputChange };
}

