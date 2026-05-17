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
      admin_actions: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          notes: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          notes?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_clicks: {
        Row: {
          clicked_at: string
          id: string
          link_id: string
          referrer_video_id: string | null
          user_id: string | null
        }
        Insert: {
          clicked_at?: string
          id?: string
          link_id: string
          referrer_video_id?: string | null
          user_id?: string | null
        }
        Update: {
          clicked_at?: string
          id?: string
          link_id?: string
          referrer_video_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_referrer_video_id_fkey"
            columns: ["referrer_video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_links: {
        Row: {
          click_count: number
          commission_pct: number | null
          created_at: string
          creator_id: string
          id: string
          is_active: boolean
          label: string
          provider: string
          updated_at: string
          url: string
          video_id: string | null
        }
        Insert: {
          click_count?: number
          commission_pct?: number | null
          created_at?: string
          creator_id: string
          id?: string
          is_active?: boolean
          label: string
          provider?: string
          updated_at?: string
          url: string
          video_id?: string | null
        }
        Update: {
          click_count?: number
          commission_pct?: number | null
          created_at?: string
          creator_id?: string
          id?: string
          is_active?: boolean
          label?: string
          provider?: string
          updated_at?: string
          url?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_links_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_links_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_partners: {
        Row: {
          commission_pct: number | null
          created_at: string
          display_name: string
          enabled: boolean
          id: string
          network: string
          tracking_param: string | null
          tracking_value: string | null
          updated_at: string
        }
        Insert: {
          commission_pct?: number | null
          created_at?: string
          display_name: string
          enabled?: boolean
          id?: string
          network: string
          tracking_param?: string | null
          tracking_value?: string | null
          updated_at?: string
        }
        Update: {
          commission_pct?: number | null
          created_at?: string
          display_name?: string
          enabled?: boolean
          id?: string
          network?: string
          tracking_param?: string | null
          tracking_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      business_invites: {
        Row: {
          accepted_business_id: string | null
          accepted_deal_id: string | null
          business_name: string
          city: string | null
          commission_pct: number
          contact_email: string
          contact_phone: string | null
          created_at: string
          creator_id: string
          creator_share_pct: number
          decline_reason: string | null
          existing_business_id: string | null
          expires_at: string
          id: string
          platform_share_pct: number
          status: string
          token: string
          updated_at: string
          video_id: string
          website_url: string
        }
        Insert: {
          accepted_business_id?: string | null
          accepted_deal_id?: string | null
          business_name: string
          city?: string | null
          commission_pct?: number
          contact_email: string
          contact_phone?: string | null
          created_at?: string
          creator_id: string
          creator_share_pct?: number
          decline_reason?: string | null
          existing_business_id?: string | null
          expires_at?: string
          id?: string
          platform_share_pct?: number
          status?: string
          token: string
          updated_at?: string
          video_id: string
          website_url: string
        }
        Update: {
          accepted_business_id?: string | null
          accepted_deal_id?: string | null
          business_name?: string
          city?: string | null
          commission_pct?: number
          contact_email?: string
          contact_phone?: string | null
          created_at?: string
          creator_id?: string
          creator_share_pct?: number
          decline_reason?: string | null
          existing_business_id?: string | null
          expires_at?: string
          id?: string
          platform_share_pct?: number
          status?: string
          token?: string
          updated_at?: string
          video_id?: string
          website_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_invites_accepted_business_id_fkey"
            columns: ["accepted_business_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_invites_accepted_deal_id_fkey"
            columns: ["accepted_deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_invites_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_invites_existing_business_id_fkey"
            columns: ["existing_business_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_invites_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
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
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
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
            foreignKeyName: "deal_applications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_applications_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_applications_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_applications_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "deal_clicks_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_clicks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_clicks_referrer_video_id_fkey"
            columns: ["referrer_video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_clicks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_discovery_runs: {
        Row: {
          candidates_found: number
          errors: Json
          finished_at: string | null
          id: string
          inserted: number
          query: string | null
          skipped_duplicate: number
          started_at: string
        }
        Insert: {
          candidates_found?: number
          errors?: Json
          finished_at?: string | null
          id?: string
          inserted?: number
          query?: string | null
          skipped_duplicate?: number
          started_at?: string
        }
        Update: {
          candidates_found?: number
          errors?: Json
          finished_at?: string | null
          id?: string
          inserted?: number
          query?: string | null
          skipped_duplicate?: number
          started_at?: string
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "deal_impressions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_impressions_referrer_video_id_fkey"
            columns: ["referrer_video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_impressions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "deal_redirects_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_redirects_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          affiliate_network: string | null
          ai_confidence: number | null
          ai_summary: string | null
          business_id: string | null
          city: string | null
          click_count: number
          country: string | null
          created_at: string
          currency: string | null
          description: string | null
          destination: string | null
          discount_label: string | null
          discovered_at: string | null
          embedded_at: string | null
          embedding: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          last_seen_at: string | null
          lat: number | null
          lng: number | null
          original_url: string | null
          price_cents: number | null
          quality_reasons: Json | null
          quality_score: number | null
          source: string
          starts_at: string | null
          status: string
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          affiliate_network?: string | null
          ai_confidence?: number | null
          ai_summary?: string | null
          business_id?: string | null
          city?: string | null
          click_count?: number
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          destination?: string | null
          discount_label?: string | null
          discovered_at?: string | null
          embedded_at?: string | null
          embedding?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          last_seen_at?: string | null
          lat?: number | null
          lng?: number | null
          original_url?: string | null
          price_cents?: number | null
          quality_reasons?: Json | null
          quality_score?: number | null
          source?: string
          starts_at?: string | null
          status?: string
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          affiliate_network?: string | null
          ai_confidence?: number | null
          ai_summary?: string | null
          business_id?: string | null
          city?: string | null
          click_count?: number
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          destination?: string | null
          discount_label?: string | null
          discovered_at?: string | null
          embedded_at?: string | null
          embedding?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          last_seen_at?: string | null
          lat?: number | null
          lng?: number | null
          original_url?: string | null
          price_cents?: number | null
          quality_reasons?: Json | null
          quality_score?: number | null
          source?: string
          starts_at?: string | null
          status?: string
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
        Relationships: [
          {
            foreignKeyName: "itineraries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      moderation_flags: {
        Row: {
          confidence: number
          created_at: string
          id: string
          label: string
          reason: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          confidence: number
          created_at?: string
          id?: string
          label: string
          reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          label?: string
          reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_flags_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      music_tracks: {
        Row: {
          artist: string
          audio_url: string
          cover_url: string | null
          created_at: string
          duration_sec: number | null
          id: string
          is_active: boolean
          license: string | null
          source: string | null
          title: string
        }
        Insert: {
          artist: string
          audio_url: string
          cover_url?: string | null
          created_at?: string
          duration_sec?: number | null
          id?: string
          is_active?: boolean
          license?: string | null
          source?: string | null
          title: string
        }
        Update: {
          artist?: string
          audio_url?: string
          cover_url?: string | null
          created_at?: string
          duration_sec?: number | null
          id?: string
          is_active?: boolean
          license?: string | null
          source?: string | null
          title?: string
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_socials: {
        Row: {
          instagram_handle: string | null
          tiktok_handle: string | null
          updated_at: string
          user_id: string
          website_url: string | null
          x_handle: string | null
          youtube_channel_id: string | null
          youtube_handle: string | null
        }
        Insert: {
          instagram_handle?: string | null
          tiktok_handle?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
          x_handle?: string | null
          youtube_channel_id?: string | null
          youtube_handle?: string | null
        }
        Update: {
          instagram_handle?: string | null
          tiktok_handle?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
          x_handle?: string | null
          youtube_channel_id?: string | null
          youtube_handle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_socials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      video_business_suggestions: {
        Row: {
          category: string | null
          city: string | null
          confidence: number | null
          converted_invite_id: string | null
          country: string | null
          detected_at: string
          id: string
          name: string
          source: string | null
          status: string
          video_id: string
          website_guess: string | null
        }
        Insert: {
          category?: string | null
          city?: string | null
          confidence?: number | null
          converted_invite_id?: string | null
          country?: string | null
          detected_at?: string
          id?: string
          name: string
          source?: string | null
          status?: string
          video_id: string
          website_guess?: string | null
        }
        Update: {
          category?: string | null
          city?: string | null
          confidence?: number | null
          converted_invite_id?: string | null
          country?: string | null
          detected_at?: string
          id?: string
          name?: string
          source?: string | null
          status?: string
          video_id?: string
          website_guess?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_business_suggestions_converted_invite_id_fkey"
            columns: ["converted_invite_id"]
            isOneToOne: false
            referencedRelation: "business_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_business_suggestions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_deal_suggestions: {
        Row: {
          deal_id: string
          score: number
          suggested_at: string
          video_id: string
        }
        Insert: {
          deal_id: string
          score?: number
          suggested_at?: string
          video_id: string
        }
        Update: {
          deal_id?: string
          score?: number
          suggested_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_deal_suggestions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_deal_suggestions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_deals: {
        Row: {
          attached_at: string
          attached_by: string
          deal_id: string
          position: number
          video_id: string
        }
        Insert: {
          attached_at?: string
          attached_by: string
          deal_id: string
          position?: number
          video_id: string
        }
        Update: {
          attached_at?: string
          attached_by?: string
          deal_id?: string
          position?: number
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_deals_attached_by_fkey"
            columns: ["attached_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_deals_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_deals_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
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
          embed_mode: string
          embedded_at: string | null
          embedding: string | null
          id: string
          is_draft: boolean
          is_featured: boolean
          is_hidden: boolean
          lat: number | null
          like_count: number
          lng: number | null
          moderated_at: string | null
          moderated_by: string | null
          music_track_id: string | null
          mux_asset_id: string | null
          mux_playback_id: string | null
          mux_upload_id: string | null
          published_at: string | null
          save_count: number
          scheduled_at: string | null
          search_tsv: unknown
          source_platform: string
          source_url: string | null
          source_video_id: string | null
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
          embed_mode?: string
          embedded_at?: string | null
          embedding?: string | null
          id?: string
          is_draft?: boolean
          is_featured?: boolean
          is_hidden?: boolean
          lat?: number | null
          like_count?: number
          lng?: number | null
          moderated_at?: string | null
          moderated_by?: string | null
          music_track_id?: string | null
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          mux_upload_id?: string | null
          published_at?: string | null
          save_count?: number
          scheduled_at?: string | null
          search_tsv?: unknown
          source_platform?: string
          source_url?: string | null
          source_video_id?: string | null
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
          embed_mode?: string
          embedded_at?: string | null
          embedding?: string | null
          id?: string
          is_draft?: boolean
          is_featured?: boolean
          is_hidden?: boolean
          lat?: number | null
          like_count?: number
          lng?: number | null
          moderated_at?: string | null
          moderated_by?: string | null
          music_track_id?: string | null
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          mux_upload_id?: string | null
          published_at?: string | null
          save_count?: number
          scheduled_at?: string | null
          search_tsv?: unknown
          source_platform?: string
          source_url?: string | null
          source_video_id?: string | null
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
          {
            foreignKeyName: "videos_music_track_id_fkey"
            columns: ["music_track_id"]
            isOneToOne: false
            referencedRelation: "music_tracks"
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
      match_deals: {
        Args: {
          match_count?: number
          min_similarity?: number
          only_active?: boolean
          query_embedding: string
        }
        Returns: {
          id: string
          similarity: number
        }[]
      }
      match_videos: {
        Args: {
          match_count?: number
          min_similarity?: number
          query_embedding: string
        }
        Returns: {
          id: string
          similarity: number
        }[]
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
