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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      collection_items: {
        Row: {
          added_at: string
          collection_id: string
          video_id: string
        }
        Insert: {
          added_at?: string
          collection_id: string
          video_id: string
        }
        Update: {
          added_at?: string
          collection_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          cover_video_id: string | null
          created_at: string
          description: string | null
          id: string
          owner_id: string
          title: string
          visibility: string
        }
        Insert: {
          cover_video_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          owner_id: string
          title: string
          visibility?: string
        }
        Update: {
          cover_video_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          owner_id?: string
          title?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_cover_video_id_fkey"
            columns: ["cover_video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          parent_id: string | null
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_applications: {
        Row: {
          approved_code: string | null
          business_id: string
          commission_pct: number | null
          created_at: string
          creator_id: string
          deal_id: string
          decided_at: string | null
          decided_by: string | null
          id: string
          pitch: string | null
          requested_code: string | null
          status: Database["public"]["Enums"]["deal_application_status"]
          updated_at: string
        }
        Insert: {
          approved_code?: string | null
          business_id: string
          commission_pct?: number | null
          created_at?: string
          creator_id: string
          deal_id: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          pitch?: string | null
          requested_code?: string | null
          status?: Database["public"]["Enums"]["deal_application_status"]
          updated_at?: string
        }
        Update: {
          approved_code?: string | null
          business_id?: string
          commission_pct?: number | null
          created_at?: string
          creator_id?: string
          deal_id?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          pitch?: string | null
          requested_code?: string | null
          status?: Database["public"]["Enums"]["deal_application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_applications_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_clicks: {
        Row: {
          clicked_at: string
          creator_id: string | null
          deal_id: string
          id: string
          referrer_video_id: string | null
          user_id: string | null
        }
        Insert: {
          clicked_at?: string
          creator_id?: string | null
          deal_id: string
          id?: string
          referrer_video_id?: string | null
          user_id?: string | null
        }
        Update: {
          clicked_at?: string
          creator_id?: string | null
          deal_id?: string
          id?: string
          referrer_video_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_clicks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_impressions: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          referrer_video_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          referrer_video_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          referrer_video_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      deal_redirects: {
        Row: {
          code: string
          created_at: string
          creator_id: string
          deal_id: string
        }
        Insert: {
          code: string
          created_at?: string
          creator_id: string
          deal_id: string
        }
        Update: {
          code?: string
          created_at?: string
          creator_id?: string
          deal_id?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          business_id: string
          city: string | null
          click_count: number
          country: string | null
          created_at: string
          currency: string | null
          description: string | null
          destination: string | null
          discount_label: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          lat: number | null
          lng: number | null
          price_cents: number | null
          starts_at: string | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          business_id: string
          city?: string | null
          click_count?: number
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          destination?: string | null
          discount_label?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          price_cents?: number | null
          starts_at?: string | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          business_id?: string
          city?: string | null
          click_count?: number
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          destination?: string | null
          discount_label?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          price_cents?: number | null
          starts_at?: string | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      destination_summaries: {
        Row: {
          best_time: string | null
          city: string
          country: string
          generated_at: string
          highlights: Json
          id: string
          summary: string
        }
        Insert: {
          best_time?: string | null
          city: string
          country: string
          generated_at?: string
          highlights?: Json
          id?: string
          summary: string
        }
        Update: {
          best_time?: string | null
          city?: string
          country?: string
          generated_at?: string
          highlights?: Json
          id?: string
          summary?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          creator_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          follower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      itineraries: {
        Row: {
          budget_tag: string | null
          city: string | null
          country: string | null
          created_at: string
          days: number
          destination: string
          id: string
          interests: string[]
          plan: Json
          summary: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_tag?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          days: number
          destination: string
          id?: string
          interests?: string[]
          plan?: Json
          summary?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_tag?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          days?: number
          destination?: string
          id?: string
          interests?: string[]
          plan?: Json
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string
          comment_id: string | null
          created_at: string
          deal_id: string | null
          id: string
          read_at: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
          video_id: string | null
        }
        Insert: {
          actor_id: string
          comment_id?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          read_at?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
          video_id?: string | null
        }
        Update: {
          actor_id?: string
          comment_id?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          read_at?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
          video_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          username?: string
        }
        Relationships: []
      }
      saves: {
        Row: {
          created_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saves_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_views: {
        Row: {
          created_at: string
          id: string
          user_id: string | null
          video_id: string
          watch_ms: number
        }
        Insert: {
          created_at?: string
          id?: string
          user_id?: string | null
          video_id: string
          watch_ms?: number
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string | null
          video_id?: string
          watch_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_views_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          activity_tags: string[]
          ai_analyzed_at: string | null
          ai_suggested_title: string | null
          budget_tag: string | null
          captions_ready: boolean
          city: string | null
          comment_count: number
          country: string | null
          created_at: string
          creator_id: string
          description: string | null
          destination: string | null
          duration_sec: number | null
          id: string
          lat: number | null
          like_count: number
          lng: number | null
          mux_asset_id: string | null
          mux_playback_id: string | null
          mux_upload_id: string | null
          save_count: number
          search_tsv: unknown
          status: string
          thumbnail_url: string | null
          title: string
          transcript: string | null
          view_count: number
        }
        Insert: {
          activity_tags?: string[]
          ai_analyzed_at?: string | null
          ai_suggested_title?: string | null
          budget_tag?: string | null
          captions_ready?: boolean
          city?: string | null
          comment_count?: number
          country?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          destination?: string | null
          duration_sec?: number | null
          id?: string
          lat?: number | null
          like_count?: number
          lng?: number | null
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          mux_upload_id?: string | null
          save_count?: number
          search_tsv?: unknown
          status?: string
          thumbnail_url?: string | null
          title: string
          transcript?: string | null
          view_count?: number
        }
        Update: {
          activity_tags?: string[]
          ai_analyzed_at?: string | null
          ai_suggested_title?: string | null
          budget_tag?: string | null
          captions_ready?: boolean
          city?: string | null
          comment_count?: number
          country?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          destination?: string | null
          duration_sec?: number | null
          id?: string
          lat?: number | null
          like_count?: number
          lng?: number | null
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          mux_upload_id?: string | null
          save_count?: number
          search_tsv?: unknown
          status?: string
          thumbnail_url?: string | null
          title?: string
          transcript?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "videos_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "traveller" | "creator" | "business" | "admin"
      deal_application_status: "pending" | "approved" | "declined" | "withdrawn"
      notification_type:
        | "like"
        | "comment"
        | "follow"
        | "reply"
        | "deal_application"
        | "deal_application_decided"
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
      app_role: ["traveller", "creator", "business", "admin"],
      deal_application_status: ["pending", "approved", "declined", "withdrawn"],
      notification_type: [
        "like",
        "comment",
        "follow",
        "reply",
        "deal_application",
        "deal_application_decided",
      ],
    },
  },
} as const
