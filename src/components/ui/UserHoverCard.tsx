import { useState, useRef, useCallback, useLayoutEffect, useId } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger, HoverCardPortal } from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Users, UserCheck, GraduationCap, CalendarDays } from "lucide-react";
import gsap from "gsap";
import { cn } from "@/lib/utils";
import { useHalo } from "@/hooks/useHalo";

interface UserProfile {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    bio: string | null;
    department: string | null;
    year: string | null;
}

interface UserStats {
    followers: number;
    following: number;
}

interface RecentPost {
    id: string;
    content: string;
    image_url: string | null;
    created_at: string;
}

interface CachedUserData {
    profile: UserProfile;
    stats: UserStats;
    recentPosts: RecentPost[];
    fetchedAt: number;
}

// Module-level cache shared across all UserHoverCard instances — 5 min TTL
const userDataCache = new Map<string, CachedUserData>();
const CACHE_TTL = 5 * 60 * 1000;

function getCachedData(userId: string): CachedUserData | null {
    const cached = userDataCache.get(userId);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached;
    if (cached) userDataCache.delete(userId);
    return null;
}

interface UserHoverCardProps {
    userId: string;
    children: React.ReactNode;
    className?: string;
}

export function UserHoverCard({ userId, children, className }: UserHoverCardProps) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [stats, setStats] = useState<UserStats>({ followers: 0, following: 0 });
    const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    // Unique IDs for SVG clip-paths to avoid collisions when multiple cards exist
    const instanceId = useId().replace(/:/g, "");

    // GSAP Animation Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const postsRef = useRef<HTMLDivElement>(null);
    const svgContainerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<SVGImageElement>(null);
    const mainGroupRef = useRef<SVGGElement>(null);
    const masterTl = useRef<gsap.core.Timeline | null>(null);
    const activeImageIndex = useRef(0);

    // The 3 clip-path shape IDs for this instance
    const clipIds = [
        `clip-grid-${instanceId}`,
        `clip-bento-${instanceId}`,
        `clip-organic-${instanceId}`,
    ];

    const imagePosts = recentPosts.filter((p) => p.image_url);

    const createLoop = useCallback((index: number) => {
        if (imagePosts.length === 0) return;

        // Ensure we're within bounds
        const safeIndex = index % imagePosts.length;
        const clipId = clipIds[safeIndex % clipIds.length];
        const selector = `#${clipId} .path`;

        if (masterTl.current) {
            masterTl.current.kill();
        }

        const imgPost = imagePosts[safeIndex];
        if (imageRef.current && imgPost.image_url) {
            imageRef.current.setAttribute("href", imgPost.image_url);
        }
        if (mainGroupRef.current) {
            mainGroupRef.current.setAttribute("clip-path", `url(#${clipId})`);
        }

        // Reset the paths for the new shape
        gsap.set(selector, { scale: 0, transformOrigin: "50% 50%" });

        const tl = gsap.timeline({
            onComplete: () => {
                // Pause briefly before the next one starts
                gsap.delayedCall(0.8, () => createLoop(index + 1));
            },
        });

        // 1. IN (Expo Out)
        tl.to(selector, {
            scale: 1,
            duration: 0.7,
            stagger: { amount: 0.3, from: "random" },
            ease: "expo.out",
        })
            // 2. IDLE (Sine Breath)
            .to(selector, {
                scale: 1.04,
                duration: 1.2,
                yoyo: true,
                repeat: 1,
                ease: "sine.inOut",
                stagger: { amount: 0.15, from: "center" },
            })
            // 3. OUT (Expo In)
            .to(selector, {
                scale: 0,
                duration: 0.5,
                stagger: { amount: 0.2, from: "edges" },
                ease: "expo.in",
            });

        masterTl.current = tl;
    }, [imagePosts, clipIds]);

    const fetchUserData = async () => {
        if (loading || profile) return;

        // Check cache first
        const cached = getCachedData(userId);
        if (cached) {
            setProfile(cached.profile);
            setStats(cached.stats);
            setRecentPosts(cached.recentPosts);
            return;
        }

        setLoading(true);

        try {
            // Fetch Profile, Stats, and Posts in parallel
            const [{ data: profileData }, { count: followersCount }, { count: followingCount }, { data: postsData }] = await Promise.all([
                supabase
                    .from("profiles")
                    .select("user_id, display_name, avatar_url, bio, department, year")
                    .eq("user_id", userId)
                    .single(),
                supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_user_id", userId),
                supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_user_id", userId),
                supabase
                    .from("posts")
                    .select("id, content, image_url, created_at, reactions(id)")
                    .eq("user_id", userId)
                    .order("created_at", { ascending: false })
                    .limit(40),
            ]);

            const fetchedProfile = profileData as UserProfile | null;
            const fetchedStats = { followers: followersCount || 0, following: followingCount || 0 };

            let fetchedPosts: RecentPost[] = [];
            if (postsData) {
                const processed = postsData.map(p => ({
                    ...p,
                    reaction_count: (p.reactions as any[])?.length || 0
                }));
                processed.sort((a, b) => b.reaction_count - a.reaction_count || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                fetchedPosts = processed.slice(0, 3);
            }

            if (fetchedProfile) {
                setProfile(fetchedProfile);
                setStats(fetchedStats);
                setRecentPosts(fetchedPosts);

                // Store in cache
                userDataCache.set(userId, {
                    profile: fetchedProfile,
                    stats: fetchedStats,
                    recentPosts: fetchedPosts,
                    fetchedAt: Date.now(),
                });
            }
        } catch (error) {
            console.error("Error fetching user preview data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Animate the SVG after posts load and card is open
    useLayoutEffect(() => {
        if (!isOpen || loading || imagePosts.length === 0 || !svgContainerRef.current) return;

        const ctx = gsap.context(() => {
            activeImageIndex.current = 0;
            createLoop(0);
        }, svgContainerRef);

        return () => {
            if (masterTl.current) masterTl.current.kill();
            ctx.revert();
        };
    }, [isOpen, loading, imagePosts.length]);

    // Stagger-in text posts
    useLayoutEffect(() => {
        if (!isOpen || loading || recentPosts.length === 0 || !postsRef.current) return;

        const ctx = gsap.context(() => {
            const items = gsap.utils.toArray<HTMLElement>(".rhc-post-item", postsRef.current!);
            gsap.set(items, { opacity: 0, y: 8 });
            gsap.to(items, {
                opacity: 1,
                y: 0,
                duration: 0.35,
                stagger: 0.08,
                ease: "power2.out",
                delay: 0.15,
            });
        }, postsRef);

        return () => ctx.revert();
    }, [isOpen, loading, recentPosts.length]);

    const hasImagePosts = imagePosts.length > 0;
    const textOnlyPosts = recentPosts.filter((p) => !p.image_url);

    return (
        <HoverCard openDelay={350} closeDelay={200} onOpenChange={(open) => {
            setIsOpen(open);
            if (open) fetchUserData();
            if (!open && masterTl.current) {
                masterTl.current.kill();
                masterTl.current = null;
            }
        }}>
            <HoverCardTrigger asChild>
                <span className={cn("cursor-pointer hover:underline transition-colors", className)}>
                    {children}
                </span>
            </HoverCardTrigger>

            <HoverCardPortal>
                <HoverCardContent
                    className="w-96 bg-[#0A0A0A]/95 backdrop-blur-2xl border border-white/[0.08] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.8),0_0_40px_-8px_rgba(124,58,237,0.15)] p-0 overflow-hidden rounded-2xl z-[100]"
                    side="top"
                    align="center"
                    sideOffset={8}
                    collisionPadding={20}
                >
                    {loading ? (
                        <div className="flex h-40 items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                    ) : profile ? (
                        <div ref={containerRef} className="flex flex-col">
                            {/* ─── HEADER ─── */}
                            <div className="p-5 pb-0">
                                <div className="flex items-start gap-4">
                                    {/* Avatar with neon ring */}
                                    <div className="relative">
                                        <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary/50 to-accent/50 blur-sm opacity-60" />
                                        <Avatar className="relative h-16 w-16 border-2 border-[#1A1A1A] ring-2 ring-primary/30">
                                            <AvatarImage src={profile.avatar_url || ""} className="object-cover" />
                                            <AvatarFallback className="bg-gradient-to-br from-primary/30 to-accent/20 text-white text-xl font-black">
                                                {profile.display_name?.charAt(0) || "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>

                                    {/* Name + Pills */}
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <h4 className="text-[15px] font-extrabold text-white truncate tracking-tight">
                                            {profile.display_name}
                                        </h4>

                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {profile.department && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-300 bg-white/[0.06] border border-white/[0.06] px-2 py-0.5 rounded-full">
                                                    <GraduationCap className="h-2.5 w-2.5 text-primary/70" />
                                                    {profile.department}
                                                </span>
                                            )}
                                            {profile.year && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-300 bg-white/[0.06] border border-white/[0.06] px-2 py-0.5 rounded-full">
                                                    <CalendarDays className="h-2.5 w-2.5 text-accent/70" />
                                                    {profile.year}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Bio */}
                                {profile.bio && (
                                    <p className="text-[12px] text-zinc-400 line-clamp-2 mt-3 leading-[1.6]">
                                        {profile.bio}
                                    </p>
                                )}

                                {/* ─── STATS BAR ─── */}
                                <div className="flex gap-5 mt-4 pb-4 border-b border-white/[0.05]">
                                    <div className="flex items-center gap-1.5">
                                        <Users className="h-3 w-3 text-primary/60" />
                                        <span className="text-sm font-black text-white">{stats.followers}</span>
                                        <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Followers</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <UserCheck className="h-3 w-3 text-accent/60" />
                                        <span className="text-sm font-black text-white">{stats.following}</span>
                                        <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Following</span>
                                    </div>
                                </div>
                            </div>

                            {/* ─── RECENT POSTS — SVG CLIP-PATH ANIMATION ─── */}
                            {recentPosts.length > 0 && (
                                <div className="p-4 pt-3" ref={postsRef}>
                                    <h5 className="text-[10px] font-bold text-zinc-500 mb-2.5 uppercase tracking-[0.15em]">
                                        Recent Posts
                                    </h5>

                                    {/* SVG Animation for image posts */}
                                    {hasImagePosts && (
                                        <div ref={svgContainerRef} className="relative mb-2.5">
                                            <div className="absolute -inset-2 bg-primary/[0.04] blur-2xl rounded-full" />
                                            <svg
                                                viewBox="0 0 360 200"
                                                className="w-full h-auto rounded-xl overflow-hidden relative z-10 drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
                                            >
                                                <defs>
                                                    {/* Grid: 3x2 sharp squares */}
                                                    <clipPath id={clipIds[0]}>
                                                        {Array.from({ length: 6 }).map((_, i) => (
                                                            <rect
                                                                key={i}
                                                                className="path"
                                                                x={(i % 3) * 120 + 4}
                                                                y={Math.floor(i / 3) * 100 + 4}
                                                                width="112"
                                                                height="92"
                                                                rx="6"
                                                            />
                                                        ))}
                                                    </clipPath>

                                                    {/* Bento: mixed-size rounded rects */}
                                                    <clipPath id={clipIds[1]}>
                                                        <rect className="path" x="4" y="4" width="170" height="192" rx="10" />
                                                        <rect className="path" x="182" y="4" width="174" height="92" rx="10" />
                                                        <rect className="path" x="182" y="104" width="82" height="92" rx="10" />
                                                        <rect className="path" x="272" y="104" width="84" height="92" rx="10" />
                                                    </clipPath>

                                                    {/* Organic: pill + circular shapes */}
                                                    <clipPath id={clipIds[2]}>
                                                        <rect className="path" x="4" y="4" width="352" height="24" rx="12" />
                                                        <rect className="path" x="4" y="36" width="170" height="130" rx="14" />
                                                        <rect className="path" x="182" y="36" width="174" height="60" rx="14" />
                                                        <rect className="path" x="182" y="104" width="174" height="62" rx="14" />
                                                        <rect className="path" x="4" y="174" width="352" height="22" rx="11" />
                                                    </clipPath>
                                                </defs>

                                                <g ref={mainGroupRef} clipPath={`url(#${clipIds[0]})`}>
                                                    <image
                                                        ref={imageRef}
                                                        href={imagePosts[0]?.image_url || ""}
                                                        width="360"
                                                        height="200"
                                                        preserveAspectRatio="xMidYMid slice"
                                                    />
                                                </g>
                                            </svg>
                                        </div>
                                    )}

                                    {/* Text-only posts */}
                                    {textOnlyPosts.length > 0 && (
                                        <div className="space-y-1.5">
                                            {textOnlyPosts.map((post) => (
                                                <div
                                                    key={post.id}
                                                    className="rhc-post-item bg-white/[0.03] border border-white/[0.05] p-2.5 rounded-xl hover:bg-white/[0.06] transition-colors cursor-default"
                                                >
                                                    <p className="text-[11px] text-zinc-300 line-clamp-2 leading-relaxed">
                                                        {post.content}
                                                    </p>
                                                    <span className="text-[9px] text-zinc-600 mt-1 block font-medium">
                                                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-5 text-center text-sm text-zinc-500">
                            User not found
                        </div>
                    )}
                </HoverCardContent>
            </HoverCardPortal>
        </HoverCard>
    );
}
