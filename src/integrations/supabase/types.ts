export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      blocked_users: {
        Row: {
          blocked_user_id: string
          blocker_user_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_user_id: string
          blocker_user_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_user_id?: string
          blocker_user_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          gossip_post_id: string | null
          id: string
          parent_id: string | null
          post_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          gossip_post_id?: string | null
          id?: string
          parent_id?: string | null
          post_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          gossip_post_id?: string | null
          id?: string
          parent_id?: string | null
          post_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_gossip_post_id_fkey"
            columns: ["gossip_post_id"]
            isOneToOne: false
            referencedRelation: "anonymous_gossip_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_gossip_post_id_fkey"
            columns: ["gossip_post_id"]
            isOneToOne: false
            referencedRelation: "gossip_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      dating_likes: {
        Row: {
          comment: string
          content_liked: string
          created_at: string | null
          id: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          comment: string
          content_liked: string
          created_at?: string | null
          id?: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          comment?: string
          content_liked?: string
          created_at?: string | null
          id?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      dating_profiles: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          media: string[] | null
          prompts: Json | null
          updated_at: string | null
          vitals: Json | null
        }
        Insert: {
          created_at?: string | null
          id: string
          is_active?: boolean | null
          media?: string[] | null
          prompts?: Json | null
          updated_at?: string | null
          vitals?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          media?: string[] | null
          prompts?: Json | null
          updated_at?: string | null
          vitals?: Json | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_user_id: string
          following_user_id: string
          id: string
          status: string
        }
        Insert: {
          created_at?: string
          follower_user_id: string
          following_user_id: string
          id?: string
          status?: string
        }
        Update: {
          created_at?: string
          follower_user_id?: string
          following_user_id?: string
          id?: string
          status?: string
        }
        Relationships: []
      }
      gossip_posts: {
        Row: {
          content: string
          created_at: string
          expires_at: string | null
          gossip_alias: string
          gossip_avatar: string
          hidden_from_usernames: string[] | null
          hotness_score: number | null
          id: string
          is_flagged: boolean
          is_followers_only: boolean | null
          tagged_user_id: string | null
          university_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          expires_at?: string | null
          gossip_alias: string
          gossip_avatar?: string
          hidden_from_usernames?: string[] | null
          hotness_score?: number | null
          id?: string
          is_flagged?: boolean
          is_followers_only?: boolean | null
          tagged_user_id?: string | null
          university_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          expires_at?: string | null
          gossip_alias?: string
          gossip_avatar?: string
          hidden_from_usernames?: string[] | null
          hotness_score?: number | null
          id?: string
          is_flagged?: boolean
          is_followers_only?: boolean | null
          tagged_user_id?: string | null
          university_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gossip_posts_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      gossip_tags: {
        Row: {
          created_at: string
          gossip_post_id: string
          id: string
          tagged_user_id: string
        }
        Insert: {
          created_at?: string
          gossip_post_id: string
          id?: string
          tagged_user_id: string
        }
        Update: {
          created_at?: string
          gossip_post_id?: string
          id?: string
          tagged_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gossip_tags_gossip_post_id_fkey"
            columns: ["gossip_post_id"]
            isOneToOne: false
            referencedRelation: "anonymous_gossip_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gossip_tags_gossip_post_id_fkey"
            columns: ["gossip_post_id"]
            isOneToOne: false
            referencedRelation: "gossip_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_scores: {
        Row: {
          created_at: string
          id: string
          score: number
          university_id: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          score?: number
          university_id: string
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          score?: number
          university_id?: string
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_scores_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string | null
          id: string
          is_read: boolean
          recipient_id: string
          type: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          is_read?: boolean
          recipient_id: string
          type: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          is_read?: boolean
          recipient_id?: string
          type?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          archived_at: string | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_archived: boolean | null
          university_id: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_archived?: boolean | null
          university_id: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_archived?: boolean | null
          university_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          anonymous_alias: string
          avatar_url: string | null
          bio: string | null
          created_at: string
          department: string | null
          display_name: string
          id: string
          is_private: boolean
          stream: string | null
          university_id: string
          updated_at: string
          user_id: string
          year: string | null
        }
        Insert: {
          anonymous_alias?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          department?: string | null
          display_name?: string
          id?: string
          is_private?: boolean
          stream?: string | null
          university_id: string
          updated_at?: string
          user_id: string
          year?: string | null
        }
        Update: {
          anonymous_alias?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          department?: string | null
          display_name?: string
          id?: string
          is_private?: boolean
          stream?: string | null
          university_id?: string
          updated_at?: string
          user_id?: string
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          created_at: string
          gossip_post_id: string | null
          id: string
          post_id: string | null
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gossip_post_id?: string | null
          id?: string
          post_id?: string | null
          reaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gossip_post_id?: string | null
          id?: string
          post_id?: string | null
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_gossip_post_id_fkey"
            columns: ["gossip_post_id"]
            isOneToOne: false
            referencedRelation: "anonymous_gossip_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_gossip_post_id_fkey"
            columns: ["gossip_post_id"]
            isOneToOne: false
            referencedRelation: "gossip_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reported_gossip_post_id: string | null
          reported_post_id: string | null
          reporter_user_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string
          reported_gossip_post_id?: string | null
          reported_post_id?: string | null
          reporter_user_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reported_gossip_post_id?: string | null
          reported_post_id?: string | null
          reporter_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_gossip_post_id_fkey"
            columns: ["reported_gossip_post_id"]
            isOneToOne: false
            referencedRelation: "anonymous_gossip_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_gossip_post_id_fkey"
            columns: ["reported_gossip_post_id"]
            isOneToOne: false
            referencedRelation: "gossip_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_post_id_fkey"
            columns: ["reported_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_gossips: {
        Row: {
          created_at: string
          gossip_post_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gossip_post_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gossip_post_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_gossips_gossip_post_id_fkey"
            columns: ["gossip_post_id"]
            isOneToOne: false
            referencedRelation: "anonymous_gossip_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_gossips_gossip_post_id_fkey"
            columns: ["gossip_post_id"]
            isOneToOne: false
            referencedRelation: "gossip_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_posts: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      secret_crushes: {
        Row: {
          created_at: string | null
          crush_username: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          crush_username: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          crush_username?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      universities: {
        Row: {
          created_at: string
          email_domains: string[]
          id: string
          logo_url: string | null
          name: string
        }
        Insert: {
          created_at?: string
          email_domains?: string[]
          id?: string
          logo_url?: string | null
          name: string
        }
        Update: {
          created_at?: string
          email_domains?: string[]
          id?: string
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      anonymous_gossip_posts: {
        Row: {
          content: string | null
          created_at: string | null
          gossip_alias: string | null
          gossip_avatar: string | null
          hidden_from_usernames: string[] | null
          id: string | null
          tagged_user_id: string | null
          university_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          gossip_alias?: string | null
          gossip_avatar?: string | null
          hidden_from_usernames?: string[] | null
          id?: string | null
          tagged_user_id?: string | null
          university_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          gossip_alias?: string | null
          gossip_avatar?: string | null
          hidden_from_usernames?: string[] | null
          id?: string | null
          tagged_user_id?: string | null
          university_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gossip_posts_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_secret_crush: { Args: { p_crush_username: string }; Returns: Json }
      check_mutual_follow: {
        Args: { user_a: string; user_b: string }
        Returns: boolean
      }
      get_profile_id: { Args: { _user_id: string }; Returns: string }
      get_user_university_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { conv_id: string; uid: string }
        Returns: boolean
      }
      resolve_username_to_email: {
        Args: { target_display_name: string }
        Returns: string
      }
      send_dating_like: {
        Args: {
          p_comment: string
          p_content_liked: string
          p_receiver_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
