# "T" — University Social Community App (Phase 1)

## Overview

A bold, vibrant campus social platform where students connect, share content, and anonymously gossip — with a competitive leaderboard. Dark theme with electric purple and neon pink accents, mobile-first design.

## Backend (Supabase)

- **Authentication** with email domain whitelisting —  make the email domain whitelisting dynamic, not limited to .[ac.uk](http://ac.uk) domains. Any university email domain should be supported, with domains managed through the admin dashboard where I can add new universities and their email domains over time
- **Database tables**: universities, profiles, posts, gossip_posts, reactions, leaderboard_scores, reports, user_roles, blocked_users
- **Storage buckets** for profile photos and post images
- **Row-Level Security** ensuring students only see content from their own campus
- **Edge function** for profanity filtering on gossip submissions

---

## Phase 1 Features

### 1. Auth & Onboarding

- Sign up / login restricted to whitelisted university email domains
- During signup, user selects their university from a list (auto-detected from email domain)
- Profile setup: display name, photo upload, bio, interests

### 2. User Profiles

- Public profile page showing photo, name, bio, university, interests
- Follower/following counts
- Current leaderboard rank and gossip score
- Follow/unfollow buttons

### 3. Campus Feed

- Card-based feed of photo + text posts from same campus only
- Bold typography, vivid gradient cards on dark background
- Like, emoji reactions, and comments on posts
- Create post with text and optional image upload
- Bottom navigation bar: **Feed | Gossip | Leaderboard | Profile**

### 4. Anonymous Gossip

- Dedicated gossip tab — anonymous posts about campus members
- Each gossip author gets a random fun alias + avatar (e.g. "MysteriousPanda42")
- Tag another campus member in a gossip post
- Upvotes and emoji reactions on gossip posts
- Profanity auto-filter blocks offensive language before posting
- Report/flag button on every gossip post

### 5. Leaderboard

- Weekly campus leaderboard ranking students by **Gossip Score**
- Score based on: times tagged in gossip, upvotes on gossip about them, engagement on their own posts
- Bold visual top-10 ranking with rank badges, avatars, names, scores
- Resets every Monday at midnight (cron job)
- Previous week's winner archived and highlighted

### 6. Safety & Moderation

- Report button on all gossip posts
- Block/mute other users
- Admin moderation dashboard to review and remove flagged content
- Auto-filter for slurs and offensive language via edge function

---

## Design Direction

- **Dark base** with electric purple (#8B5CF6) and neon pink (#EC4899) accents
- Large, bold typography — expressive and youthful
- Gradient cards, glowing highlights, smooth transitions
- Mobile-first responsive layout with bottom tab navigation
- Inspired by TikTok/BeReal energy

---

## Phase 2 (Future)

- Events board with RSVP
- Real-time direct messaging
- Push notifications
- Trending gossip / viral detection