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
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    if (!authHeader || (authHeader !== `Bearer ${serviceRoleKey}` && req.headers.get("apikey") !== serviceRoleKey)) {
      console.error("Unauthorized attempt to access calculate-hotness");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const postIds = posts.map((p) => p.id);

    // 3. Fetch collective metrics
    const [{ data: reactions }, { data: comments }] = await Promise.all([
      supabase.from("reactions").select("gossip_post_id").in("gossip_post_id", postIds),
      supabase.from("comments").select("gossip_post_id").in("gossip_post_id", postIds),
    ]);

    const now = Date.now();

    // 4. Calculate Scores
    const rawScores = posts.map((post) => {
      const likes = reactions?.filter((r) => r.gossip_post_id === post.id).length ?? 0;
      const commentCount = comments?.filter((c) => c.gossip_post_id === post.id).length ?? 0;

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

    // 5. Batch Update via Upsert (much faster than individual updates)
    // We only update the hotness_score field to avoid clobbering other data
    // Note: upsert requires all non-nullable fields or a specific constraint
    // Since we're in an edge function, we'll use a transaction-like batch if many records,
    // or just parallelize a few updates if small, but upsert with onConflict is best.

    const { error: updateError } = await supabase
      .from("gossip_posts")
      .upsert(updates, { onConflict: 'id' });

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
      details: err.message
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
