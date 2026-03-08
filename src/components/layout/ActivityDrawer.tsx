import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHalo } from "@/hooks/useHalo";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Bell, UserPlus, Flame, Heart, Loader2, ArrowUp, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  type: "follow" | "post_like" | "gossip_tag" | "gossip_upvote" | "post_comment";
  is_read: boolean;
  created_at: string;
  actor_id: string | null;
  entity_id: string | null;
  actor_profile?: { display_name: string; avatar_url: string | null };
}

export function ActivityDrawer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error || !data) {
      setLoading(false);
      return;
    }

    // Fetch actor profiles for non-anonymous actions
    const actorIds = [...new Set(data.filter((n) => n.actor_id).map((n) => n.actor_id as string))];
    let profiles: any[] | null = [];

    if (actorIds.length > 0) {
      const { data: fetchedProfiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", actorIds);
      profiles = fetchedProfiles;
    }

    const enriched = data.map((n) => ({
      ...n,
      type: n.type as Notification["type"],
      actor_profile: profiles?.find((p) => p.user_id === n.actor_id),
    }));

    setNotifications(enriched);
    setUnreadCount(enriched.filter((n) => !n.is_read).length);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          setUnreadCount((prev) => prev + 1);
          // If drawer is open, refresh the full list
          if (isOpen) fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isOpen]);

  const markAsRead = async () => {
    if (!user || unreadCount === 0) return;
    await supabase.from("notifications").update({ is_read: true }).eq("recipient_id", user.id).eq("is_read", false);
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      fetchNotifications();
      markAsRead();
    }
  };

  const getNotificationContent = (notif: Notification) => {
    switch (notif.type) {
      case "follow":
        return {
          icon: <UserPlus className="h-4 w-4 text-primary" />,
          text: (
            <>
              <span className="font-bold text-foreground">{notif.actor_profile?.display_name || "Someone"}</span>{" "}
              started following you
            </>
          ),
          action: () => navigate(`/profile/${notif.actor_id}`),
        };
      case "gossip_tag":
        return {
          icon: <Flame className="h-4 w-4 text-[#EC4899]" />,
          text: (
            <>
              You were tagged in <span className="font-bold text-[#EC4899]">Anonymous Gossip!</span>
            </>
          ),
          action: () => navigate(notif.entity_id ? `/gossip?gossipId=${notif.entity_id}` : "/gossip"),
        };
      case "gossip_upvote":
        return {
          icon: <ArrowUp className="h-4 w-4 text-success" />,
          text: (
            <>
              Someone upvoted <span className="font-bold text-success">Gossip</span> about you 👀
            </>
          ),
          action: () => navigate(notif.entity_id ? `/gossip?gossipId=${notif.entity_id}` : "/gossip"),
        };
      case "post_like":
        return {
          icon: <Heart className="h-4 w-4 text-red-500 fill-red-500" />,
          text: (
            <>
              <span className="font-bold text-foreground">{notif.actor_profile?.display_name || "Someone"}</span> liked
              your post
            </>
          ),
          action: () => navigate(notif.entity_id ? `/feed?postId=${notif.entity_id}` : "/feed"),
        };
      case "post_comment":
        return {
          icon: <MessageCircle className="h-4 w-4 text-blue-400 fill-blue-400/20" />,
          text: (
            <>
              <span className="font-bold text-foreground">{notif.actor_profile?.display_name || "Someone"}</span>{" "}
              commented on your post
            </>
          ),
          action: () => navigate(notif.entity_id ? `/feed?postId=${notif.entity_id}&showComments=true` : "/feed"),
        };
      default:
        return { icon: <Bell className="h-4 w-4" />, text: "New notification", action: () => {} };
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpen}>
      <SheetTrigger asChild>
        <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground transition-transform active:scale-95">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-primary ring-2 ring-background" />
          )}
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:w-[400px] bg-[#0A0A0A]/95 backdrop-blur-2xl border-l border-white/[0.05] p-0 flex flex-col"
      >
        <SheetHeader className="px-6 py-4 border-b border-white/[0.05]">
          <SheetTitle className="text-foreground text-left text-xl font-extrabold">Activity</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto opacity-20 mb-3" />
              <p className="text-sm font-medium">Nothing to see here yet.</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const { icon, text, action } = getNotificationContent(notif);
              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    action();
                    setIsOpen(false);
                  }}
                  className={`flex items-start gap-3 p-3 rounded-2xl cursor-pointer transition-colors ${notif.is_read ? "hover:bg-white/[0.04]" : "glass-panel border-primary/20 hover:bg-primary/10"}`}
                >
                  <div className="mt-1 shrink-0 bg-white/[0.04] p-2 rounded-full border border-white/[0.05]">{icon}</div>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="text-sm text-muted-foreground leading-tight">{text}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1 font-medium tracking-wide uppercase">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
