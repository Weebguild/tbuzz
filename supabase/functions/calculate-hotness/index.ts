/// <reference lib="deno.ns" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GossipPost {
  id: string;
  created_at: string;
  expires_at: string;
  hotness_score?: number;
}

interface Reaction {
  gossip_post_id: string;
}

interface Comment {
  gossip_post_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Cleanup: Delete expired gossip posts permanently
    const nowTimestamp = new Date().toISOString();
    const { error: deleteError } = await supabase
      .from("gossip_posts")
      .delete()
      .lt("expires_at", nowTimestamp);

    if (deleteError) {
      console.error("Cleanup error:", deleteError);
      // We continue even if cleanup fails
    }

    // 2. Fetch all valid gossip posts
    const { data: posts, error: postsError } = await supabase
      .from("gossip_posts")
      .select("id, created_at, expires_at");

    if (postsError) throw postsError;
    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ updated: 0, cleaned: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const typedPosts = posts as GossipPost[];
    const postIds = typedPosts.map((p) => p.id);

    // 3. Fetch collective metrics
    const [{ data: reactions }, { data: comments }] = await Promise.all([
      supabase.from("reactions").select("gossip_post_id").in("gossip_post_id", postIds),
      supabase.from("comments").select("gossip_post_id").in("gossip_post_id", postIds),
    ]);

    const typedReactions = (reactions || []) as Reaction[];
    const typedComments = (comments || []) as Comment[];

    const now = Date.now();

    // 4. Calculate Scores
    const rawScores = typedPosts.map((post) => {
      const likes = typedReactions.filter((r) => r.gossip_post_id === post.id).length;
      const commentCount = typedComments.filter((c) => c.gossip_post_id === post.id).length;

      // Prevent division by zero or negative skew
      const hoursOld = Math.max((now - new Date(post.created_at).getTime()) / (1000 * 60 * 60), 0.01);

      // Hacker News style gravity formula
      const score = (likes + commentCount * 2) / Math.pow(hoursOld + 2, 1.5);
      return { id: post.id, score: isNaN(score) ? 0 : score };
    });

    const maxScore = Math.max(...rawScores.map((s) => s.score), 0.001);

    const updates = rawScores.map((s) => ({
      id: s.id,
      hotness_score: Number(Math.min(s.score / maxScore, 1.0).toFixed(4)),
    }));

    // 5. Batch Update via individual updates (upsert requires all non-nullable fields)
    const updatePromises = updates.map((u) =>
      supabase
        .from("gossip_posts")
        .update({ hotness_score: u.hotness_score })
        .eq("id", u.id)
    );

    const results = await Promise.all(updatePromises);
    const updateError = results.find((r) => r.error)?.error;
    if (updateError) throw updateError;

    return new Response(JSON.stringify({
      updated: updates.length,
      timestamp: nowTimestamp
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("calculate-hotness failure:", err);
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: err instanceof Error ? err.message : String(err)
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
