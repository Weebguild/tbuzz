import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence, animate } from "framer-motion";
import {
  Grid,
  LayoutList,
  Heart,
  MapPin,
  Calendar,
  Loader2,
  LogOut,
  MessageCircle,
  Mail,
  UserPlus,
  UserCheck,
  AlertTriangle,
  Bookmark,
  ArrowUp,
  ArrowRight,
  Camera,
  Settings,
  Ghost,
  Lock,
  Archive,
} from "lucide-react";
import { PostSkeleton } from "@/components/ui/PostSkeleton";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { PostImageExpander } from "@/components/feed/PostImageExpander";
import { TextScramble } from "@/components/ui/text-scramble";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Edit3 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

// ── CUSTOM COMPONENT: SMOOTH COUNTING ANIMATION ──
function AnimatedNumber({ value }: { value: number }) {
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (node) {
      const controls = animate(0, value, {
        duration: 1.5,
        ease: "easeOut",
        onUpdate(v) {
          node.textContent = Math.round(v).toString();
        },
      });
      return () => controls.stop();
    }
  }, [value]);

  return <span ref={nodeRef}>{value}</span>;
}

interface ProfileData {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  department: string | null;
  year: string | null;
  anonymous_alias: string | null;
  is_private: boolean;
}

interface PhotoPost {
  id: string;
  image_url: string;
  reaction_count: number;
}

interface TextPost {
  id: string;
  content: string;
  created_at: string;
  reaction_count: number;
  comment_count: number;
  has_liked: boolean;
}

interface SavedPost {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
}

interface SavedGossip {
  id: string;
  content: string;
  gossip_alias: string;
  created_at: string;
  upvote_count: number;
}

type ProfileTab = "posts" | "gallery" | "saved" | "settings" | "archived";
type SavedSubFilter = "posts" | "gossip";

export default function Profile() {
  const { userId: id } = useParams();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const targetUserId = id || user?.id;
  const isOwnProfile = targetUserId === user?.id;
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [photos, setPhotos] = useState<PhotoPost[]>([]);
  const [textPosts, setTextPosts] = useState<TextPost[]>([]);

  // Follow state
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followRequestPending, setFollowRequestPending] = useState(false);
  const [isMutualFollow, setIsMutualFollow] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const [loading, setLoading] = useState(true);


  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [tabDirection, setTabDirection] = useState(0);
  const [expandedPhoto, setExpandedPhoto] = useState<PhotoPost | null>(null);

  // Saved tab state
  const [savedSubFilter, setSavedSubFilter] = useState<SavedSubFilter>("posts");
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [savedGossips, setSavedGossips] = useState<SavedGossip[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  const [archivedPosts, setArchivedPosts] = useState<TextPost[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(false);

  // Edit state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<{ user_id: string; display_name: string; avatar_url: string | null }[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [isFollowersListOpen, setIsFollowersListOpen] = useState(false);
  const [followersList, setFollowersList] = useState<{ user_id: string; display_name: string; avatar_url: string | null }[]>([]);
  const [loadingFollowersList, setLoadingFollowersList] = useState(false);
  const [isFollowingListOpen, setIsFollowingListOpen] = useState(false);
  const [followingList, setFollowingList] = useState<{ user_id: string; display_name: string; avatar_url: string | null }[]>([]);
  const [loadingFollowingList, setLoadingFollowingList] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const postsPerPage = 10;
  
  // Observer for infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastPostElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || loadingMore) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [loading, loadingMore, hasMore]
  );

  const fetchProfileData = useCallback(async (pageNumber = 1, isInitial = false) => {
    if (!targetUserId) return;
    
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    // Batch all independent queries in parallel
    const [
      { data: profileData },
      followersResult,
      followingResult,
      { data: allPosts },
      ...followCheckResults
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", targetUserId).single(),
      (supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_user_id", targetUserId) as any).eq("status", "accepted"),
      (supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_user_id", targetUserId) as any).eq("status", "accepted"),
      supabase.from("posts").select("id, content, created_at, image_url").eq("user_id", targetUserId).neq("is_archived", true).order("created_at", { ascending: false }),
      ...(!isOwnProfile && user?.id ? [
        supabase.from("follows").select("id, status" as any).eq("follower_user_id", user.id).eq("following_user_id", targetUserId).maybeSingle(),
        supabase.from("follows").select("id, status" as any).eq("follower_user_id", targetUserId).eq("following_user_id", user.id).maybeSingle(),
      ] : []),
    ]);

    if (profileData) {
      const pd = profileData as any;
      setProfile({
        user_id: pd.user_id,
        display_name: pd.display_name,
        avatar_url: pd.avatar_url,
        bio: pd.bio,
        department: pd.department,
        year: pd.year,
        anonymous_alias: pd.anonymous_alias,
        is_private: pd.is_private ?? false,
      });
      setEditName(pd.display_name);
      setEditBio(pd.bio || "");
      setEditIsPrivate(pd.is_private || false);
    }

    setFollowersCount(followersResult?.count || 0);
    setFollowingCount(followingResult?.count || 0);

    if (!isOwnProfile && user?.id && followCheckResults.length === 2) {
      const fd = (followCheckResults[0] as any)?.data as any;
      const rd = (followCheckResults[1] as any)?.data as any;
      const isFollowingNow = !!fd && fd.status === 'accepted';
      const pending = !!fd && fd.status === 'pending';
      setIsFollowing(isFollowingNow);
      setFollowRequestPending(pending);
      setIsMutualFollow(isFollowingNow && !!rd && rd.status === 'accepted');
    }

    // Calculate Pagination bounds
    const fromIndex = (pageNumber - 1) * postsPerPage;
    const toIndex = fromIndex + postsPerPage - 1;

    // Fetch posts with pagination
    const { data: pagedPosts, error: postError } = await supabase
      .from("posts")
      .select("id, content, created_at, image_url")
      .eq("user_id", targetUserId)
      .neq("is_archived", true)
      .order("created_at", { ascending: false })
      .range(fromIndex, toIndex);

    if (postError) {
      console.error("Error fetching posts:", postError);
    }

    const newPosts = pagedPosts || [];
    
    // Check if we have more
    if (newPosts.length < postsPerPage) {
      setHasMore(false);
    } else {
      setHasMore(true);
    }

    const photoPosts = newPosts.filter((p) => p.image_url);
    const textPostsData = newPosts.filter((p) => !p.image_url);
    const allPostIds = newPosts.map((p) => p.id);

    if (allPostIds.length > 0) {
      const [{ data: reactions }, { data: comments }] = await Promise.all([
        supabase.from("reactions").select("post_id, user_id").in("post_id", allPostIds),
        supabase.from("comments").select("post_id").in("post_id", allPostIds),
      ]);

      const newPhotos = photoPosts.map((photo) => ({
        ...photo,
        reaction_count: reactions?.filter((r) => r.post_id === photo.id).length || 0,
      }));

      const newTextPosts = textPostsData.map((post) => ({
        ...post,
        reaction_count: reactions?.filter((r) => r.post_id === post.id).length || 0,
        comment_count: comments?.filter((c) => c.post_id === post.id).length || 0,
        has_liked: reactions?.some((r) => r.post_id === post.id && r.user_id === user?.id) || false,
      }));

      if (isInitial) {
        setPhotos(newPhotos);
        setTextPosts(newTextPosts);
      } else {
        setPhotos(prev => [...prev, ...newPhotos]);
        setTextPosts(prev => [...prev, ...newTextPosts]);
      }
    } else if (isInitial) {
      setPhotos([]);
      setTextPosts([]);
    }

    setLoading(false);
    setLoadingMore(false);
  }, [targetUserId, user?.id, isOwnProfile]);

  useEffect(() => {
    fetchProfileData(1, true);
  }, [fetchProfileData]);

  useEffect(() => {
    if (page > 1) {
      fetchProfileData(page, false);
    }
  }, [page, fetchProfileData]);

  const fetchSavedItems = useCallback(async () => {
    if (!user || !isOwnProfile) return;
    setLoadingSaved(true);

    if (savedSubFilter === "posts") {
      const { data: saved } = await supabase
        .from("saved_posts")
        .select("post_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (saved && saved.length > 0) {
        const postIds = saved.map((s) => s.post_id);
        const { data: posts } = await supabase
          .from("posts")
          .select("id, content, image_url, created_at, user_id")
          .in("id", postIds);

        if (posts) {
          const userIds = [...new Set(posts.map((p) => p.user_id))];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url")
            .in("user_id", userIds);

          const enriched: SavedPost[] = saved.map((s) => {
            const post = posts.find((p) => p.id === s.post_id);
            const prof = profiles?.find((pr) => pr.user_id === post?.user_id);
            return {
              id: post?.id ?? s.post_id,
              content: post?.content ?? "",
              image_url: post?.image_url ?? null,
              created_at: post?.created_at ?? s.created_at,
              author_name: prof?.display_name ?? "Unknown",
              author_avatar: prof?.avatar_url ?? null,
            };
          });
          setSavedPosts(enriched);
        }
      } else {
        setSavedPosts([]);
      }
    } else {
      const { data: saved } = await supabase
        .from("saved_gossips")
        .select("gossip_post_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (saved && saved.length > 0) {
        const gossipIds = saved.map((s) => s.gossip_post_id);
        const { data: gossips } = await supabase
          .from("anonymous_gossip_posts")
          .select("id, content, gossip_alias, created_at")
          .in("id", gossipIds);

        const { data: reactions } = await supabase
          .from("reactions")
          .select("gossip_post_id")
          .in("gossip_post_id", gossipIds);

        const enriched: SavedGossip[] = saved.map((s) => {
          const gossip = gossips?.find((g) => g.id === s.gossip_post_id);
          return {
            id: gossip?.id ?? s.gossip_post_id,
            content: gossip?.content ?? "",
            gossip_alias: gossip?.gossip_alias ?? "Anonymous",
            created_at: gossip?.created_at ?? s.created_at,
            upvote_count: reactions?.filter((r) => r.gossip_post_id === s.gossip_post_id).length ?? 0,
          };
        });
        setSavedGossips(enriched);
      } else {
        setSavedGossips([]);
      }
    }

    setLoadingSaved(false);
  }, [user, isOwnProfile, savedSubFilter]);

  const fetchArchivedItems = useCallback(async () => {
    if (!user || !isOwnProfile) return;
    setLoadingArchived(true);
    const { data: archived } = await supabase
      .from("posts")
      .select("id, content, created_at, image_url")
      .eq("user_id", user.id)
      .eq("is_archived", true)
      .order("archived_at", { ascending: false });

    if (archived && archived.length > 0) {
      const postIds = archived.map((p) => p.id);
      const [{ data: reactions }, { data: comments }] = await Promise.all([
        supabase.from("reactions").select("post_id").in("post_id", postIds),
        supabase.from("comments").select("post_id").in("post_id", postIds),
      ]);
      const enriched: TextPost[] = archived.map((p: any) => ({
        ...p,
        reaction_count: reactions?.filter((r) => r.post_id === p.id).length || 0,
        comment_count: comments?.filter((c) => c.post_id === p.id).length || 0,
        has_liked: false,
      }));
      setArchivedPosts(enriched);
    } else {
      setArchivedPosts([]);
    }
    setLoadingArchived(false);
  }, [user, isOwnProfile]);

  const restorePost = async (postId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("posts")
      .update({ is_archived: false, created_at: new Date().toISOString(), archived_at: null })
      .eq("id", postId);
    if (!error) {
      toast.success("Post restored to feed");
      setArchivedPosts((prev) => prev.filter((p) => p.id !== postId));
      fetchProfileData(1, true);
    } else {
      toast.error(sanitizeError(error));
    }
  };

  const permanentlyDeletePost = async (postId: string) => {
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (!error) {
      toast.success("Post permanently deleted");
      setArchivedPosts((prev) => prev.filter((p) => p.id !== postId));
    } else {
      toast.error(sanitizeError(error));
    }
  };

  useEffect(() => {
    if (activeTab === "archived" && isOwnProfile) fetchArchivedItems();
  }, [activeTab, fetchArchivedItems, isOwnProfile]);

  useEffect(() => {
    if (isRequestsOpen && user) {
      setLoadingRequests(true);
      const fetchRequests = async () => {
        const { data: followsData } = await (supabase
          .from("follows")
          .select("follower_user_id")
          .eq("following_user_id", user.id) as any)
          .eq("status", "pending");

        if (followsData && followsData.length > 0) {
          const userIds = followsData.map((f) => f.follower_user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url")
            .in("user_id", userIds);

          setPendingRequests(profiles || []);
        } else {
          setPendingRequests([]);
        }
        setLoadingRequests(false);
      };
      fetchRequests();
    }
  }, [isRequestsOpen, user]);

  const handleRequestAction = async (followerId: string, action: 'approve' | 'deny') => {
    if (!user) return;
    if (action === 'approve') {
      await (supabase.from("follows").update({ status: 'accepted' } as any).eq("follower_user_id", followerId) as any).eq("following_user_id", user.id);
      setFollowersCount(c => c + 1);
      toast.success("Follow request approved");
    } else {
      await supabase.from("follows").delete().eq("follower_user_id", followerId).eq("following_user_id", user.id);
      toast.success("Follow request denied");
    }
    setPendingRequests(prev => prev.filter(r => r.user_id !== followerId));
  };

  useEffect(() => {
    if (isFollowersListOpen && user && isOwnProfile) {
      setLoadingFollowersList(true);
      const fetchFollowers = async () => {
        const { data: followsData } = await (supabase
          .from("follows")
          .select("follower_user_id")
          .eq("following_user_id", user.id) as any)
          .eq("status", "accepted");

        if (followsData && followsData.length > 0) {
          const userIds = followsData.map((f) => f.follower_user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url")
            .in("user_id", userIds);

          setFollowersList(profiles || []);
        } else {
          setFollowersList([]);
        }
        setLoadingFollowersList(false);
      };
      fetchFollowers();
    }
  }, [isFollowersListOpen, user, isOwnProfile]);

  const handleRemoveFollower = async (followerId: string) => {
    if (!user) return;
    await supabase.from("follows").delete().eq("follower_user_id", followerId).eq("following_user_id", user.id);
    setFollowersList(prev => prev.filter(r => r.user_id !== followerId));
    setFollowersCount(c => Math.max(0, c - 1));
    toast.success("Follower removed");
  };

  useEffect(() => {
    if (isFollowingListOpen && user && isOwnProfile) {
      setLoadingFollowingList(true);
      const fetchFollowingList = async () => {
        const { data: followsData } = await (supabase
          .from("follows")
          .select("following_user_id")
          .eq("follower_user_id", user.id) as any)
          .eq("status", "accepted");

        if (followsData && followsData.length > 0) {
          const userIds = followsData.map((f) => f.following_user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url")
            .in("user_id", userIds);

          setFollowingList(profiles || []);
        } else {
          setFollowingList([]);
        }
        setLoadingFollowingList(false);
      };
      fetchFollowingList();
    }
  }, [isFollowingListOpen, user, isOwnProfile]);

  const handleUnfollow = async (followingId: string) => {
    if (!user) return;
    await supabase.from("follows").delete().eq("follower_user_id", user.id).eq("following_user_id", followingId);
    setFollowingList(prev => prev.filter(r => r.user_id !== followingId));
    setFollowingCount(c => Math.max(0, c - 1));
    toast.success("Unfollowed");
  };

  useEffect(() => {
    if (activeTab === "saved" && isOwnProfile) {
      fetchSavedItems();
    }
  }, [activeTab, savedSubFilter, fetchSavedItems, isOwnProfile]);

  const toggleFollow = async () => {
    if (!user || !targetUserId || isOwnProfile) return;
    setFollowLoading(true);
    if (isFollowing || followRequestPending) {
      await supabase.from("follows").delete().eq("follower_user_id", user.id).eq("following_user_id", targetUserId);
      if (isFollowing) {
        setFollowersCount((c) => Math.max(0, c - 1));
      }
      setIsFollowing(false);
      setFollowRequestPending(false);
      setIsMutualFollow(false);
    } else {
      const status = profile?.is_private ? 'pending' : 'accepted';
      const { error } = await supabase.from("follows").insert({ follower_user_id: user.id, following_user_id: targetUserId, status } as any);
      if (error) {
        setFollowLoading(false);
        toast.error("Failed to follow user");
        console.error(error);
        return;
      }
      if (status === 'accepted') {
        setIsFollowing(true);
        // Check if they follow us back
        const { data: reverseFollow } = await (supabase
          .from("follows")
          .select("id, status" as any)
          .eq("follower_user_id", targetUserId) as any)
          .eq("following_user_id", user.id)
          .maybeSingle();
        const rf = reverseFollow as any;
        setIsMutualFollow(!!rf && rf.status === 'accepted');
        setFollowersCount((c) => c + 1);
      } else {
        setFollowRequestPending(true);
      }
    }
    setFollowLoading(false);
  };

  const handleMessageClick = async () => {
    if (!user || !targetUserId) return;

    // Find existing conversation
    const { data: myConvs, error: myConvsError } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (myConvsError) {
      console.error("Error fetching conversations:", myConvsError);
      toast.error("Failed to check for existing conversations");
      return;
    }

    if (myConvs && myConvs.length > 0) {
      const convIds = myConvs.map((c) => c.conversation_id);
      const { data: sharedConv, error: sharedConvError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", targetUserId)
        .in("conversation_id", convIds)
        .limit(1)
        .maybeSingle();

      if (sharedConvError) {
        console.error("Error finding shared conversation:", sharedConvError);
      }

      if (sharedConv) {
        navigate(`/messages/${sharedConv.conversation_id}`);
        return;
      }
    }

    // Create new conversation (avoid SELECT-on-insert RLS by using a client-generated UUID)
    const newConvId = crypto.randomUUID();
    const { error: convError } = await supabase
      .from("conversations")
      .insert({ id: newConvId });

    if (convError) {
      console.error("Error creating conversation:", convError);
      toast.error("Failed to start new conversation");
      return;
    }

    // Insert participants in sequence so RLS can validate second insert
    const { error: selfParticipantError } = await supabase
      .from("conversation_participants")
      .insert({ conversation_id: newConvId, user_id: user.id });

    if (selfParticipantError) {
      console.error("Error adding self as participant:", selfParticipantError);
      toast.error("Failed to start conversation");
      return;
    }

    const { error: targetParticipantError } = await supabase
      .from("conversation_participants")
      .insert({ conversation_id: newConvId, user_id: targetUserId });

    if (targetParticipantError) {
      console.error("Error adding recipient as participant:", targetParticipantError);
      toast.error("Failed to add recipient to conversation");
      return;
    }

    navigate(`/messages/${newConvId}`);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditAvatarFile(file);
      setEditAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !profile || !isOwnProfile) return;
    if (!editName.trim()) {
      toast.error("Username cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      let avatarUrl = profile.avatar_url;

      if (editAvatarFile) {
        const ext = editAvatarFile.name.split(".").pop();
        const path = `${user.id}/avatar-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(path, editAvatarFile);
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = publicUrl.publicUrl;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: editName.trim(),
          bio: editBio.trim(),
          avatar_url: avatarUrl,
          is_private: editIsPrivate,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setProfile((prev) =>
        prev
          ? {
            ...prev,
            display_name: editName.trim(),
            bio: editBio.trim(),
            avatar_url: avatarUrl,
            is_private: editIsPrivate,
          }
          : null,
      );
      setIsEditOpen(false);
      setEditAvatarFile(null);
      setEditAvatarPreview(null);
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      if (error.code === "23505") {
        toast.error("This username is already taken. Please choose another one.");
      } else {
        toast.error(error.message || "Failed to update profile");
      }
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    setProfile(null);
    setPhotos([]);
    setTextPosts([]);
    setFollowersCount(0);
    setFollowingCount(0);
    setIsFollowing(false);
    setFollowRequestPending(false);
    setActiveTab("posts");
    setExpandedPhoto(null);
    setSavedPosts([]);
    setSavedGossips([]);
    fetchProfileData();
  }, [fetchProfileData, setActiveTab]);

  // Realtime reactions listener removed — toggleLike handles optimistic UI,
  // and fetchProfileData loads fresh counts on revisit.

  const toggleLike = async (postId: string, hasLiked: boolean) => {
    if (!user) return;

    setTextPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, has_liked: !hasLiked, reaction_count: hasLiked ? p.reaction_count - 1 : p.reaction_count + 1 }
          : p,
      ),
    );

    if (hasLiked) {
      await supabase.from("reactions").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("reactions").insert({ user_id: user.id, post_id: postId, reaction_type: "like" });
    }
  };

  const unsavPost = async (postId: string) => {
    if (!user) return;
    await supabase.from("saved_posts").delete().eq("post_id", postId).eq("user_id", user.id);
    setSavedPosts((prev) => prev.filter((p) => p.id !== postId));
    toast.success("Removed from saved");
  };

  const unsavGossip = async (gossipId: string) => {
    if (!user) return;
    await supabase.from("saved_gossips").delete().eq("gossip_post_id", gossipId).eq("user_id", user.id);
    setSavedGossips((prev) => prev.filter((g) => g.id !== gossipId));
    toast.success("Removed from saved");
  };

  if (loading) {
    return (
      <motion.div
        key="profile-skeleton"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="px-4 pt-6 pb-24 space-y-4"
      >
        <div className="rounded-3xl glass-panel p-6 mb-6 h-64 animate-skeleton-pulse bg-white/[0.03]" />
        <PostSkeleton />
        <PostSkeleton />
        <PostSkeleton />
      </motion.div>
    );
  }

  if (!profile) {
    return <div className="min-h-screen flex justify-center items-center text-muted-foreground">User not found.</div>;
  }

  const tabs: { key: ProfileTab; label: string; icon: React.ReactNode }[] = [
    { key: "posts", label: "Posts", icon: <LayoutList className="h-4 w-4" /> },
    { key: "gallery", label: "Gallery", icon: <Grid className="h-4 w-4" /> },
    ...(isOwnProfile ? [{ key: "saved" as ProfileTab, label: "Saved", icon: <Bookmark className="h-4 w-4" /> }] : []),
    ...(isOwnProfile ? [{ key: "archived" as ProfileTab, label: "Archived", icon: <Archive className="h-4 w-4" /> }] : []),
  ];

  return (
    <div className="px-4 pt-6 pb-24">
      {/* ── HEADER ── */}
      <div className="flex justify-between items-start mb-8">
        <h1 className="text-4xl tracking-widest text-foreground uppercase drop-shadow-md">Profile</h1>
        <div className="flex gap-2">
          {isOwnProfile && (
            <Dialog>
              <DialogTrigger asChild>
                <button className="h-10 px-4 flex items-center justify-center rounded-full glass-panel hover:bg-white/10 transition-colors text-muted-foreground hover:text-white gap-2 text-sm font-bold">
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
              </DialogTrigger>
              <DialogContent className="glass-panel border-white/10 bg-[#0A0A0A]/95 backdrop-blur-2xl text-foreground rounded-3xl sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold tracking-tight">Settings</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-6">
                  <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogTrigger asChild>
                      <button className="flex items-center justify-between w-full p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                            <Edit3 className="h-5 w-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-foreground">Edit Profile</p>
                            <p className="text-xs text-muted-foreground">Change username, bio, and avatar</p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-white transition-colors" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="glass-panel border-white/10 bg-[#0A0A0A]/95 backdrop-blur-2xl text-foreground rounded-3xl sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold tracking-tight">Edit Profile</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-6 py-6 max-h-[70vh] overflow-y-auto no-scrollbar pr-1">
                        <div className="flex flex-col items-center gap-4 mb-2">
                          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Profile Picture
                          </Label>
                          <label className="relative cursor-pointer group">
                            <Avatar className="h-24 w-24 ring-4 ring-white/10 group-hover:ring-primary transition-all shadow-[0_0_20px_rgba(124,58,237,0.2)]">
                              {editAvatarPreview ? (
                                <AvatarImage src={editAvatarPreview} className="object-cover" />
                              ) : profile.avatar_url ? (
                                <AvatarImage src={profile.avatar_url} className="object-cover" />
                              ) : (
                                <AvatarFallback className="bg-white/5 text-2xl font-bold uppercase">
                                  {editName.charAt(0)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                              <Camera className="h-6 w-6 text-white" />
                            </div>
                            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                          </label>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Username
                          </Label>
                          <Input
                            id="name"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value.toLowerCase().replace(/\s/g, ""))}
                            placeholder="Choose a unique username"
                            className="bg-white/5 border-white/10 rounded-xl focus:ring-primary focus:border-primary transition-all font-mono text-sm"
                            maxLength={20}
                          />
                          <p className="text-[10px] text-muted-foreground italic">No spaces, lowercase only. This is your login ID.</p>
                        </div>
                        <div className="grid gap-2">
                          <div className="flex justify-between items-center">
                            <Label htmlFor="bio" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                              Bio
                            </Label>
                            <span className={cn("text-[10px] font-bold", editBio.length > 150 ? "text-destructive" : "text-muted-foreground")}>
                              {editBio.length}/160
                            </span>
                          </div>
                          <Textarea
                            id="bio"
                            value={editBio}
                            onChange={(e) => setEditBio(e.target.value)}
                            placeholder="Tell us about yourself..."
                            maxLength={160}
                            className="bg-white/5 border-white/10 rounded-xl min-h-[100px] focus:ring-primary focus:border-primary transition-all resize-none text-sm leading-relaxed"
                          />
                        </div>

                        <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-4">
                          <div className="space-y-0.5 text-left pr-4">
                            <Label htmlFor="private-account" className="text-sm font-bold text-foreground">Private Account</Label>
                            <p className="text-[10px] text-muted-foreground">Only approved followers can see your posts and gallery.</p>
                          </div>
                          <Switch
                            id="private-account"
                            checked={editIsPrivate}
                            onCheckedChange={setEditIsPrivate}
                          />
                        </div>

                      </div>
                      <DialogFooter>
                        <Button
                          onClick={handleSaveProfile}
                          disabled={isSaving}
                          className="w-full rounded-full bg-primary hover:bg-primary/90 text-white font-bold h-12 shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all active:scale-95"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Changes"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isRequestsOpen} onOpenChange={setIsRequestsOpen}>
                    <DialogTrigger asChild>
                      <button className="flex items-center justify-between w-full p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                            <UserCheck className="h-5 w-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-foreground">Follow Requests</p>
                            <p className="text-xs text-muted-foreground">Approve or deny new followers</p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-white transition-colors" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="glass-panel border-white/10 bg-[#0A0A0A]/95 backdrop-blur-2xl text-foreground rounded-3xl sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold tracking-tight">Follow Requests</DialogTitle>
                      </DialogHeader>
                      <div className="py-6 max-h-[70vh] overflow-y-auto no-scrollbar pr-1 space-y-4">
                        {loadingRequests ? (
                          <div className="flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
                        ) : pendingRequests.length === 0 ? (
                          <div className="text-center text-muted-foreground text-sm">No pending requests.</div>
                        ) : (
                          pendingRequests.map(req => (
                            <div key={req.user_id} className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  {req.avatar_url ? <AvatarImage src={req.avatar_url} /> : <AvatarFallback>{req.display_name.charAt(0)}</AvatarFallback>}
                                </Avatar>
                                <p className="text-sm font-bold">{req.display_name}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleRequestAction(req.user_id, 'approve')} className="bg-primary hover:bg-primary/90 text-white font-bold px-3">Approve</Button>
                                <Button size="sm" variant="outline" onClick={() => handleRequestAction(req.user_id, 'deny')} className="border-white/10 text-foreground px-3">Deny</Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  <button
                    onClick={() => setShowLogoutDialog(true)}
                    className="flex items-center justify-between w-full p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-destructive/10 text-destructive group-hover:bg-destructive group-hover:text-white transition-colors">
                        <LogOut className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-foreground">Sign Out</p>
                        <p className="text-xs text-muted-foreground">Logout of your account</p>
                      </div>
                    </div>
                  </button>
                </div>
              </DialogContent>
            </Dialog >
          )
          }
        </div >
      </div >

      {/* ── PROFILE INFO CARD ── */}
      <div className="rounded-3xl glass-panel bg-black/40 backdrop-blur-3xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-40 h-40 bg-primary/20 rounded-full blur-[50px] pointer-events-none" />

        <div className="flex flex-col items-center text-center relative z-10">
          <Avatar className="h-24 w-24 ring-4 ring-white/10 shadow-[0_0_30px_rgba(124,58,237,0.3)] mb-4">
            {profile.avatar_url ? (
              <AvatarImage src={profile.avatar_url} className="object-cover" />
            ) : (
              <AvatarFallback className="bg-[#0A0A0A] text-2xl font-bold text-foreground">
                {profile.display_name.charAt(0)}
              </AvatarFallback>
            )}
          </Avatar>

          <h2 className="text-2xl font-bold text-foreground mb-1">{profile.display_name}</h2>

          {isOwnProfile && profile.anonymous_alias && (
            <div className="flex items-center gap-2 mb-1">
              <Ghost className="h-3.5 w-3.5 text-primary/60" />
              <TextScramble
                text={profile.anonymous_alias}
                revealOnClick
                className="text-xs font-bold tracking-wide text-primary/80"
                dudClassName="text-primary/30"
              />
            </div>
          )}

          <div className="flex items-center justify-center gap-3 text-xs font-medium text-muted-foreground/80 mb-4">
            {profile.department && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {profile.department}
              </span>
            )}
            {profile.year && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {profile.year}
              </span>
            )}
          </div>

          <p className="text-sm text-foreground/80 leading-relaxed max-w-[280px]">
            {profile.bio || "No bio added yet."}
          </p>

          {!isOwnProfile && (
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={toggleFollow}
                disabled={followLoading}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all ${isFollowing
                  ? "border border-white/10 text-muted-foreground hover:bg-white/5 hover:border-destructive/50 hover:text-destructive"
                  : "bg-primary text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:scale-105"
                  }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="h-4 w-4" /> Following
                  </>
                ) : followRequestPending ? (
                  <>
                    <UserCheck className="h-4 w-4" /> Requested
                  </>
                ) : profile.is_private ? (
                  <>
                    <UserPlus className="h-4 w-4" /> Request
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" /> Follow
                  </>
                )}
              </button>
              {isMutualFollow ? (
                <button
                  onClick={handleMessageClick}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold border border-white/10 text-foreground hover:bg-white/5 transition-all"
                >
                  <Mail className="h-4 w-4" /> Message
                </button>
              ) : isFollowing ? (
                <span className="text-[10px] text-muted-foreground/60 max-w-[120px] text-center leading-tight">
                  Follow each other to message
                </span>
              ) : null}
            </div>
          )}

          {/* ── FOLLOWER STATS ── */}
          <div className="flex items-center justify-center gap-8 mt-6 pt-5 border-t border-white/5 w-full">
            <div
              className={cn("flex flex-col items-center", isOwnProfile ? "cursor-pointer hover:opacity-80 transition-opacity" : "")}
              onClick={() => isOwnProfile && setIsFollowersListOpen(true)}
            >
              <span className="text-3xl font-display text-white tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                <AnimatedNumber value={followersCount} />
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mt-1 font-bold">
                Followers
              </span>
            </div>

            <div className="w-px h-8 bg-white/10" />

            <div
              className={cn("flex flex-col items-center", isOwnProfile ? "cursor-pointer hover:opacity-80 transition-opacity" : "")}
              onClick={() => isOwnProfile && setIsFollowingListOpen(true)}
            >
              <span className="text-3xl font-display text-white tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                <AnimatedNumber value={followingCount} />
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mt-1 font-bold">
                Following
              </span>
            </div>
          </div>
        </div>
      </div >

      {/* ── TABS ── */}
      {
        (!profile.is_private || isOwnProfile || isFollowing) ? (
          <>
            <div
              className={`flex gap-2 mb-6 p-1 glass-panel rounded-full mx-auto ${isOwnProfile ? "max-w-[300px]" : "max-w-[200px]"
                }`}
            >
              {tabs.map((tab, i) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    const currentIdx = tabs.findIndex((t) => t.key === activeTab);
                    setTabDirection(i > currentIdx ? 1 : -1);
                    setActiveTab(tab.key);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-bold transition-all ${activeTab === tab.key
                    ? "bg-white/10 text-white shadow-md"
                    : "text-muted-foreground hover:text-white/70"
                    }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* ── TAB CONTENT ── */}
            <AnimatePresence mode="wait">
              {/* TEXT POSTS FEED */}
              {activeTab === "posts" && (
                <motion.div
                  key="posts"
                  custom={tabDirection}
                  initial={{ opacity: 0, x: tabDirection * 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: tabDirection * -30 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {textPosts.length === 0 ? (
                    <div className="py-20 text-center">
                      <LayoutList className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">No text posts yet.</p>
                    </div>
                  ) : (
                    textPosts.map((post, i) => (
                      <motion.div
                        ref={i === textPosts.length - 1 ? lastPostElementRef : null}
                        key={post.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-3xl glass-panel p-4 hover:border-primary/30 transition-colors duration-500"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="h-9 w-9 ring-1 ring-white/10">
                            {profile.avatar_url ? (
                              <AvatarImage src={profile.avatar_url} />
                            ) : (
                              <AvatarFallback className="bg-black/40 text-xs font-bold text-foreground">
                                {profile.display_name.charAt(0)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <p className="font-semibold text-sm text-foreground">{profile.display_name}</p>
                            <p className="text-xs text-muted-foreground/80">
                              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>

                        <p className="text-sm leading-relaxed text-foreground/90 mb-4">{post.content}</p>

                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => toggleLike(post.id, post.has_liked)}
                            className={`flex items-center gap-1.5 text-sm transition-colors ${post.has_liked ? "text-primary drop-shadow-[0_0_8px_rgba(124,58,237,0.5)]" : "text-muted-foreground hover:text-foreground"}`}
                          >
                            <Heart className={`h-4 w-4 ${post.has_liked ? "fill-current" : ""}`} />
                            {post.reaction_count > 0 && <span className="text-xs font-medium">{post.reaction_count}</span>}
                          </button>
                          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <MessageCircle className="h-4 w-4" />
                            {post.comment_count > 0 && <span className="text-xs font-medium">{post.comment_count}</span>}
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                  {loadingMore && (
                    <div className="py-4 flex justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
                    </div>
                  )}
                </motion.div>
              )}

              {/* GALLERY GRID */}
              {activeTab === "gallery" && (
                <motion.div
                  key="gallery"
                  custom={tabDirection}
                  initial={{ opacity: 0, x: tabDirection * 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: tabDirection * -30 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-2 gap-3"
                >
                  {photos.length === 0 ? (
                    <div className="col-span-2 py-20 text-center">
                      <Grid className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">No photos uploaded yet.</p>
                    </div>
                  ) : (
                    photos.map((photo, i) => {
                      const isWide = i % 3 === 0;
                      return (
                        <motion.div
                          ref={i === photos.length - 1 ? lastPostElementRef : null}
                          key={photo.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className={`relative overflow-hidden rounded-3xl glass-panel group cursor-pointer border border-white/5 ${isWide ? "col-span-2 aspect-[2/1]" : "col-span-1 aspect-square"}`}
                          onClick={() => setExpandedPhoto(photo)}
                        >
                          <img
                            src={photo.image_url}
                            alt="Gallery"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                            <div className="flex items-center gap-1.5 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                  {loadingMore && activeTab === "gallery" && (
                    <div className="col-span-2 py-4 flex justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
                    </div>
                  )}
                </motion.div>
              )}

              {/* SAVED TAB - only own profile */}
              {activeTab === "saved" && isOwnProfile && (
                <motion.div
                  key="saved"
                  custom={tabDirection}
                  initial={{ opacity: 0, x: tabDirection * 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: tabDirection * -30 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Sub-filter */}
                  <div className="flex gap-2 p-1 glass-panel rounded-full max-w-[220px] mx-auto">
                    <button
                      onClick={() => setSavedSubFilter("posts")}
                      className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${savedSubFilter === "posts" ? "bg-white/10 text-white shadow-md" : "text-muted-foreground hover:text-white/70"}`}
                    >
                      Posts
                    </button>
                    <button
                      onClick={() => setSavedSubFilter("gossip")}
                      className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${savedSubFilter === "gossip" ? "bg-white/10 text-white shadow-md" : "text-muted-foreground hover:text-white/70"}`}
                    >
                      Gossip
                    </button>
                  </div>

                  {loadingSaved ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : savedSubFilter === "posts" ? (
                    savedPosts.length === 0 ? (
                      <div className="py-20 text-center">
                        <Bookmark className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground font-medium">No saved posts yet.</p>
                      </div>
                    ) : (
                      savedPosts.map((post, i) => (
                        <motion.div
                          key={post.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="rounded-3xl glass-panel p-4 hover:border-primary/30 transition-colors duration-500"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <Avatar className="h-9 w-9 ring-1 ring-white/10">
                              {post.author_avatar ? (
                                <AvatarImage src={post.author_avatar} />
                              ) : (
                                <AvatarFallback className="bg-black/40 text-xs font-bold text-foreground">
                                  {post.author_name.charAt(0)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-foreground">{post.author_name}</p>
                              <p className="text-xs text-muted-foreground/80">
                                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                              </p>
                            </div>
                            <motion.button
                              onClick={() => unsavPost(post.id)}
                              whileTap={{ scale: 1.4 }}
                              transition={{ type: "spring", stiffness: 400, damping: 10 }}
                              className="text-foreground"
                            >
                              <Bookmark className="h-4 w-4 fill-current" />
                            </motion.button>
                          </div>
                          {post.image_url && (
                            <img src={post.image_url} alt="Saved post" className="w-full rounded-xl max-h-48 object-cover mb-3 border border-white/5" loading="lazy" />
                          )}
                          <p className="text-sm leading-relaxed text-foreground/90">{post.content}</p>
                        </motion.div>
                      ))
                    )
                  ) : (
                    savedGossips.length === 0 ? (
                      <div className="py-20 text-center">
                        <Bookmark className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground font-medium">No saved gossip yet.</p>
                      </div>
                    ) : (
                      savedGossips.map((gossip, i) => (
                        <motion.div
                          key={gossip.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="rounded-3xl glass-panel p-4 hover:border-primary/30 transition-colors duration-500"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <Avatar className="h-9 w-9 ring-1 ring-white/10">
                              <AvatarFallback className="bg-black/40 text-base">🎭</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-sm text-primary drop-shadow-[0_0_8px_rgba(124,58,237,0.3)]">
                                {gossip.gossip_alias}
                              </span>
                              <p className="text-xs text-muted-foreground/80">
                                {formatDistanceToNow(new Date(gossip.created_at), { addSuffix: true })}
                              </p>
                            </div>
                            <motion.button
                              onClick={() => unsavGossip(gossip.id)}
                              whileTap={{ scale: 1.4 }}
                              transition={{ type: "spring", stiffness: 400, damping: 10 }}
                              className="text-foreground"
                            >
                              <Bookmark className="h-4 w-4 fill-current" />
                            </motion.button>
                          </div>
                          <p className="text-sm leading-relaxed text-foreground/90 mb-3">{gossip.content}</p>
                          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                            <ArrowUp className="h-3.5 w-3.5" />
                            <span className="font-bold">{gossip.upvote_count}</span>
                          </div>
                        </motion.div>
                      ))
                    )
                  )}
                </motion.div>
              )}
              
              {/* ARCHIVED TAB - only own profile */}
              {activeTab === "archived" && isOwnProfile && (
                <motion.div
                  key="archived"
                  custom={tabDirection}
                  initial={{ opacity: 0, x: tabDirection * 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: tabDirection * -30 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {loadingArchived ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : archivedPosts.length === 0 ? (
                    <div className="py-20 text-center">
                      <Archive className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">No archived posts.</p>
                      <p className="text-xs text-muted-foreground">Posts in archive are auto-deleted after 1 year.</p>
                    </div>
                  ) : (
                    archivedPosts.map((post, i) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-3xl glass-panel p-4 hover:border-primary/30 transition-colors duration-500 opacity-80"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="h-9 w-9 ring-1 ring-white/10 grayscale">
                            {profile.avatar_url ? (
                              <AvatarImage src={profile.avatar_url} />
                            ) : (
                              <AvatarFallback className="bg-black/40 text-xs font-bold text-foreground">
                                {profile.display_name.charAt(0)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground">{profile.display_name}</p>
                            <p className="text-xs text-muted-foreground/80">Archived</p>
                          </div>
                          <div className="flex gap-2">
                             <Button size="sm" variant="outline" onClick={() => permanentlyDeletePost(post.id)} className="h-8 border-destructive/30 text-destructive hover:bg-destructive/10 text-xs px-2">Delete</Button>
                             <Button size="sm" onClick={() => restorePost(post.id)} className="h-8 bg-primary hover:bg-primary/90 text-white text-xs px-2">Restore</Button>
                          </div>
                        </div>

                        {(post as any).image_url && (
                          <img src={(post as any).image_url} alt="Archived post" className="w-full rounded-xl max-h-48 object-cover mb-3 border border-white/5 grayscale" />
                        )}
                        <p className="text-sm leading-relaxed text-foreground/70 mb-4 italic">{post.content}</p>

                        <div className="flex items-center gap-4 opacity-70">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Heart className="h-4 w-4" />
                            {post.reaction_count > 0 && <span className="text-xs font-medium">{post.reaction_count}</span>}
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MessageCircle className="h-4 w-4" />
                            {post.comment_count > 0 && <span className="text-xs font-medium">{post.comment_count}</span>}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="py-20 text-center flex flex-col items-center">
            <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4 ring-1 ring-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
              <Lock className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">This account is private</h3>
            <p className="text-sm text-muted-foreground">Follow this account to see their photos and posts.</p>
          </div>
        )
      }

      {/* ── FOLLOWERS LIST DIALOG ── */}
      <Dialog open={isFollowersListOpen} onOpenChange={setIsFollowersListOpen}>
        <DialogContent className="glass-panel border-white/10 bg-[#0A0A0A]/95 backdrop-blur-2xl text-foreground rounded-3xl sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight">Your Followers</DialogTitle>
          </DialogHeader>
          <div className="py-6 max-h-[70vh] overflow-y-auto no-scrollbar pr-1 flex flex-col gap-4">
            {loadingFollowersList ? (
              <div className="flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : followersList.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm">You have no followers yet.</div>
            ) : (
              followersList.map(follower => (
                <div key={follower.user_id} className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {follower.avatar_url ? <AvatarImage src={follower.avatar_url} /> : <AvatarFallback>{follower.display_name.charAt(0)}</AvatarFallback>}
                    </Avatar>
                    <p className="text-sm font-bold">{follower.display_name}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveFollower(follower.user_id)}
                    className="border-white/10 text-foreground px-3 hover:bg-destructive hover:text-white"
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── FOLLOWING LIST DIALOG ── */}
      <Dialog open={isFollowingListOpen} onOpenChange={setIsFollowingListOpen}>
        <DialogContent className="glass-panel border-white/10 bg-[#0A0A0A]/95 backdrop-blur-2xl text-foreground rounded-3xl sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight">Following</DialogTitle>
          </DialogHeader>
          <div className="py-6 max-h-[70vh] overflow-y-auto no-scrollbar pr-1 flex flex-col gap-4">
            {loadingFollowingList ? (
              <div className="flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : followingList.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm">You aren't following anyone yet.</div>
            ) : (
              followingList.map(following => (
                <div key={following.user_id} className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {following.avatar_url ? <AvatarImage src={following.avatar_url} /> : <AvatarFallback>{following.display_name.charAt(0)}</AvatarFallback>}
                    </Avatar>
                    <p className="text-sm font-bold">{following.display_name}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUnfollow(following.user_id)}
                    className="border-white/10 text-foreground px-3 hover:bg-destructive hover:text-white"
                  >
                    Unfollow
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── SPLIT-SCREEN IMAGE EXPANDER ── */}
      <AnimatePresence>
        {expandedPhoto && (
          <PostImageExpander
            postId={expandedPhoto.id}
            imageUrl={expandedPhoto.image_url}
            hasLiked={false}
            reactionCount={expandedPhoto.reaction_count}
            commentCount={0}
            onClose={() => setExpandedPhoto(null)}
            onToggleLike={() => {
              toast.success("Liked from profile!");
            }}
          />
        )}
      </AnimatePresence>
      {/* ── LOGOUT CONFIRMATION DIALOG ── */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="border-white/10 bg-white/5 backdrop-blur-2xl shadow-[0_8px_60px_rgba(0,0,0,0.6)] rounded-3xl max-w-sm mx-auto">
          <AlertDialogHeader className="items-center text-center">
            <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mb-2 ring-1 ring-destructive/20">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-foreground">Log out?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              You'll need to sign in again to access your account. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0 mt-2">
            <AlertDialogAction
              onClick={async () => {
                await signOut();
                navigate("/auth");
              }}
              className="w-full rounded-full bg-destructive hover:bg-destructive/90 text-white font-bold py-3 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
            >
              Yes, log me out
            </AlertDialogAction>
            <AlertDialogCancel className="w-full rounded-full border-white/10 bg-white/5 hover:bg-white/10 text-foreground font-bold py-3 mt-0">
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}
