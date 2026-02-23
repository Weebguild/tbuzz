import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all non-expired gossip posts
    const { data: posts, error: postsError } = await supabase
      .from("gossip_posts")
      .select("id, created_at, expires_at")
      .or("expires_at.is.null,expires_at.gt." + new Date().toISOString());

    if (postsError) throw postsError;
    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const postIds = posts.map((p) => p.id);

    // Fetch reactions and comments counts
    const [{ data: reactions }, { data: comments }] = await Promise.all([
      supabase.from("reactions").select("gossip_post_id").in("gossip_post_id", postIds),
      supabase.from("comments").select("gossip_post_id").in("gossip_post_id", postIds),
    ]);

    const now = Date.now();

    // Calculate raw scores
    const rawScores = posts.map((post) => {
      const likes = reactions?.filter((r) => r.gossip_post_id === post.id).length ?? 0;
      const commentCount = comments?.filter((c) => c.gossip_post_id === post.id).length ?? 0;
      const hoursOld = (now - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
      const score = (likes + commentCount * 2) / Math.pow(hoursOld + 2, 1.5);
      return { id: post.id, score };
    });

    // Normalize to 0.0 - 1.0
    const maxScore = Math.max(...rawScores.map((s) => s.score), 0.001);

    const updates = rawScores.map((s) => ({
      id: s.id,
      hotness_score: Math.min(s.score / maxScore, 1.0),
    }));

    // Batch update
    for (const u of updates) {
      await supabase
        .from("gossip_posts")
        .update({ hotness_score: u.hotness_score })
        .eq("id", u.id);
    }

    return new Response(JSON.stringify({ updated: updates.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
