import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function test() {
    // Let's first log in as a real user
    const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email: 'test@tbuzz.app', // Assuming a test user exists, else let's try a direct insert using ANON key which will fail RLS, but maybe we can sign in anonymously if allowed?
        password: 'password123'
    });

    if (authError || !session) {
        console.log("Auth error, script needs valid credentials to bypass RLS or test correctly.", authError);
        // Try to get ANY auth user or just do an anon request
        const { error } = await supabase.from('follows').insert({ follower_user_id: '00000000-0000-0000-0000-000000000000', following_user_id: '11111111-1111-1111-1111-111111111111', status: 'pending' });
        console.log("Anon insert error:", error);
        return;
    }
}
test();
