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
          business_id: string | null
          canonical_key: string | null
          click_count: number
          commission_pct: number | null
          created_at: string
          creator_id: string
          id: string
          is_active: boolean
          label: string
          link_kind: Database["public"]["Enums"]["affiliate_link_kind"]
          parity_exempt: boolean
          parity_exempt_reason: string | null
          provider: string
          supplier_ref: string | null
          supplier_type: Database["public"]["Enums"]["supplier_type"] | null
          updated_at: string
          url: string
          video_id: string | null
        }
        Insert: {
          business_id?: string | null
          canonical_key?: string | null
          click_count?: number
          commission_pct?: number | null
          created_at?: string
          creator_id: string
          id?: string
          is_active?: boolean
          label: string
          link_kind?: Database["public"]["Enums"]["affiliate_link_kind"]
          parity_exempt?: boolean
          parity_exempt_reason?: string | null
          provider?: string
          supplier_ref?: string | null
          supplier_type?: Database["public"]["Enums"]["supplier_type"] | null
          updated_at?: string
          url: string
          video_id?: string | null
        }
        Update: {
          business_id?: string | null
          canonical_key?: string | null
          click_count?: number
          commission_pct?: number | null
          created_at?: string
          creator_id?: string
          id?: string
          is_active?: boolean
          label?: string
          link_kind?: Database["public"]["Enums"]["affiliate_link_kind"]
          parity_exempt?: boolean
          parity_exempt_reason?: string | null
          provider?: string
          supplier_ref?: string | null
          supplier_type?: Database["public"]["Enums"]["supplier_type"] | null
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
          partner_url_template: string | null
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
          partner_url_template?: string | null
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
          partner_url_template?: string | null
          tracking_param?: string | null
          tracking_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      booking_refunds: {
        Row: {
          amount_cents: number
          booking_id: string
          created_at: string
          currency: string
          id: string
          initiated_by: string | null
          initiated_role: string | null
          reason: string | null
          status: string
          stripe_refund_id: string | null
        }
        Insert: {
          amount_cents: number
          booking_id: string
          created_at?: string
          currency?: string
          id?: string
          initiated_by?: string | null
          initiated_role?: string | null
          reason?: string | null
          status?: string
          stripe_refund_id?: string | null
        }
        Update: {
          amount_cents?: number
          booking_id?: string
          created_at?: string
          currency?: string
          id?: string
          initiated_by?: string | null
          initiated_role?: string | null
          reason?: string | null
          status?: string
          stripe_refund_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_refunds_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_reviews: {
        Row: {
          booking_id: string
          business_id: string
          comment: string | null
          created_at: string
          creator_id: string | null
          deal_id: string
          id: string
          matched_video: boolean | null
          photos: string[]
          rating: number
          referrer_video_id: string | null
          status: string
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_id: string
          business_id: string
          comment?: string | null
          created_at?: string
          creator_id?: string | null
          deal_id: string
          id?: string
          matched_video?: boolean | null
          photos?: string[]
          rating: number
          referrer_video_id?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string
          business_id?: string
          comment?: string | null
          created_at?: string
          creator_id?: string | null
          deal_id?: string
          id?: string
          matched_video?: boolean | null
          photos?: string[]
          rating?: number
          referrer_video_id?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_reviews_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_reviews_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          balance_due_at_property_cents: number
          business_id: string
          business_payout_cents: number
          cancelled_at: string | null
          commission_cents: number
          commission_pct: number
          completed_at: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          creator_id: string | null
          currency: string
          customer_email: string | null
          customer_name: string | null
          deal_id: string
          guests: number
          id: string
          notes: string | null
          paid_at: string | null
          payment_timing: string
          rate_plan_id: string | null
          referrer_video_id: string | null
          refunded_at: string | null
          review_prompt_sent_at: string | null
          review_token: string | null
          room_id: string | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          travel_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_due_at_property_cents?: number
          business_id: string
          business_payout_cents?: number
          cancelled_at?: string | null
          commission_cents?: number
          commission_pct?: number
          completed_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          creator_id?: string | null
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          deal_id: string
          guests?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_timing?: string
          rate_plan_id?: string | null
          referrer_video_id?: string | null
          refunded_at?: string | null
          review_prompt_sent_at?: string | null
          review_token?: string | null
          room_id?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          subtotal_cents: number
          tax_cents?: number
          total_cents: number
          travel_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_due_at_property_cents?: number
          business_id?: string
          business_payout_cents?: number
          cancelled_at?: string | null
          commission_cents?: number
          commission_pct?: number
          completed_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          creator_id?: string | null
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          deal_id?: string
          guests?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_timing?: string
          rate_plan_id?: string | null
          referrer_video_id?: string | null
          refunded_at?: string | null
          review_prompt_sent_at?: string | null
          review_token?: string | null
          room_id?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          travel_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_rate_plan_id_fkey"
            columns: ["rate_plan_id"]
            isOneToOne: false
            referencedRelation: "deal_rate_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "deal_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      business_agreement_acceptances: {
        Row: {
          accepted_at: string
          agreement_version: string
          id: string
          invite_id: string | null
          ip: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          agreement_version?: string
          id?: string
          invite_id?: string | null
          ip?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          agreement_version?: string
          id?: string
          invite_id?: string | null
          ip?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_agreement_acceptances_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "business_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      business_clicks: {
        Row: {
          business_id: string
          clicked_at: string
          creator_id: string | null
          id: string
          referrer_video_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          business_id: string
          clicked_at?: string
          creator_id?: string | null
          id?: string
          referrer_video_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          business_id?: string
          clicked_at?: string
          creator_id?: string | null
          id?: string
          referrer_video_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      business_collab_defaults: {
        Row: {
          brand_donts: string | null
          brand_dos: string | null
          business_id: string
          created_at: string
          default_commission_pct: number
          default_comp_room_id: string | null
          default_deliverables: Json
          default_nights: number | null
          default_usage_rights_days: number
          required_hashtags: string[]
          required_mentions: string[]
          updated_at: string
        }
        Insert: {
          brand_donts?: string | null
          brand_dos?: string | null
          business_id: string
          created_at?: string
          default_commission_pct?: number
          default_comp_room_id?: string | null
          default_deliverables?: Json
          default_nights?: number | null
          default_usage_rights_days?: number
          required_hashtags?: string[]
          required_mentions?: string[]
          updated_at?: string
        }
        Update: {
          brand_donts?: string | null
          brand_dos?: string | null
          business_id?: string
          created_at?: string
          default_commission_pct?: number
          default_comp_room_id?: string | null
          default_deliverables?: Json
          default_nights?: number | null
          default_usage_rights_days?: number
          required_hashtags?: string[]
          required_mentions?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_collab_defaults_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_collab_defaults_default_comp_room_id_fkey"
            columns: ["default_comp_room_id"]
            isOneToOne: false
            referencedRelation: "deal_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      business_collab_rules: {
        Row: {
          auto_accept_enabled: boolean
          blackout_dates: Json
          business_id: string
          created_at: string
          manual_review_above_followers: number | null
          max_accepts_per_month: number | null
          max_concurrent_active: number | null
          min_followers: number
          min_rolling_gbv_cents: number
          require_power_tier: boolean
          require_verified: boolean
          updated_at: string
        }
        Insert: {
          auto_accept_enabled?: boolean
          blackout_dates?: Json
          business_id: string
          created_at?: string
          manual_review_above_followers?: number | null
          max_accepts_per_month?: number | null
          max_concurrent_active?: number | null
          min_followers?: number
          min_rolling_gbv_cents?: number
          require_power_tier?: boolean
          require_verified?: boolean
          updated_at?: string
        }
        Update: {
          auto_accept_enabled?: boolean
          blackout_dates?: Json
          business_id?: string
          created_at?: string
          manual_review_above_followers?: number | null
          max_accepts_per_month?: number | null
          max_concurrent_active?: number | null
          min_followers?: number
          min_rolling_gbv_cents?: number
          require_power_tier?: boolean
          require_verified?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_collab_rules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          last_send_error: string | null
          last_send_status: string | null
          last_sent_at: string | null
          platform_share_pct: number
          status: string
          token: string
          updated_at: string
          video_id: string
          website_url: string | null
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
          last_send_error?: string | null
          last_send_status?: string | null
          last_sent_at?: string | null
          platform_share_pct?: number
          status?: string
          token: string
          updated_at?: string
          video_id: string
          website_url?: string | null
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
          last_send_error?: string | null
          last_send_status?: string | null
          last_sent_at?: string | null
          platform_share_pct?: number
          status?: string
          token?: string
          updated_at?: string
          video_id?: string
          website_url?: string | null
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
      business_payout_lines: {
        Row: {
          booking_id: string
          business_id: string
          commission_cents: number
          created_at: string
          currency: string
          gross_cents: number
          id: string
          net_cents: number
          payout_id: string
        }
        Insert: {
          booking_id: string
          business_id: string
          commission_cents: number
          created_at?: string
          currency?: string
          gross_cents: number
          id?: string
          net_cents: number
          payout_id: string
        }
        Update: {
          booking_id?: string
          business_id?: string
          commission_cents?: number
          created_at?: string
          currency?: string
          gross_cents?: number
          id?: string
          net_cents?: number
          payout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_payout_lines_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_payout_lines_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "business_payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      business_payouts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          booking_count: number
          business_id: string
          commission_cents: number
          created_at: string
          currency: string
          external_reference: string | null
          gross_cents: number
          id: string
          net_cents: number
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          payout_method: string | null
          period_end: string
          period_start: string
          status: string
          stripe_transfer_id: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          booking_count?: number
          business_id: string
          commission_cents?: number
          created_at?: string
          currency?: string
          external_reference?: string | null
          gross_cents?: number
          id?: string
          net_cents?: number
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payout_method?: string | null
          period_end: string
          period_start: string
          status?: string
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          booking_count?: number
          business_id?: string
          commission_cents?: number
          created_at?: string
          currency?: string
          external_reference?: string | null
          gross_cents?: number
          id?: string
          net_cents?: number
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payout_method?: string | null
          period_end?: string
          period_start?: string
          status?: string
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      business_photos: {
        Row: {
          business_id: string
          caption: string | null
          category: string
          created_at: string
          id: string
          is_cover: boolean
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          business_id: string
          caption?: string | null
          category?: string
          created_at?: string
          id?: string
          is_cover?: boolean
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          business_id?: string
          caption?: string | null
          category?: string
          created_at?: string
          id?: string
          is_cover?: boolean
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      business_thread_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          metadata: Json | null
          sender_email: string | null
          sender_kind: string
          sender_user_id: string | null
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json | null
          sender_email?: string | null
          sender_kind: string
          sender_user_id?: string | null
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json | null
          sender_email?: string | null
          sender_kind?: string
          sender_user_id?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_thread_messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_thread_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "business_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      business_threads: {
        Row: {
          business_email: string
          business_id: string | null
          business_name: string
          created_at: string
          creator_id: string
          deal_id: string | null
          id: string
          invite_id: string | null
          last_message_at: string
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          business_email: string
          business_id?: string | null
          business_name: string
          created_at?: string
          creator_id: string
          deal_id?: string | null
          id?: string
          invite_id?: string | null
          last_message_at?: string
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          business_email?: string
          business_id?: string | null
          business_name?: string
          created_at?: string
          creator_id?: string
          deal_id?: string | null
          id?: string
          invite_id?: string | null
          last_message_at?: string
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_threads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_threads_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_threads_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_threads_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "business_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      client_error_logs: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          message: string
          route: string | null
          severity: string
          source: string | null
          stack: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          message: string
          route?: string | null
          severity?: string
          source?: string | null
          stack?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          message?: string
          route?: string | null
          severity?: string
          source?: string | null
          stack?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      connect_payouts: {
        Row: {
          amount_cents: number
          arrival_date: string | null
          business_id: string
          created_at: string
          currency: string
          failure_message: string | null
          id: string
          status: string
          stripe_account_id: string
          stripe_payout_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          arrival_date?: string | null
          business_id: string
          created_at?: string
          currency: string
          failure_message?: string | null
          id?: string
          status: string
          stripe_account_id: string
          stripe_payout_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          arrival_date?: string | null
          business_id?: string
          created_at?: string
          currency?: string
          failure_message?: string | null
          id?: string
          status?: string
          stripe_account_id?: string
          stripe_payout_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "connect_payouts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_business_signings: {
        Row: {
          accepted_at: string
          agreement_version: string
          business_id: string
          commission_pct: number
          created_at: string
          creator_id: string
          creator_share_pct: number
          id: string
          platform_share_pct: number
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string
          agreement_version?: string
          business_id: string
          commission_pct?: number
          created_at?: string
          creator_id: string
          creator_share_pct?: number
          id?: string
          platform_share_pct?: number
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string
          agreement_version?: string
          business_id?: string
          commission_pct?: number
          created_at?: string
          creator_id?: string
          creator_share_pct?: number
          id?: string
          platform_share_pct?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      creator_payout_details: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          bank_name: string | null
          country: string | null
          created_at: string
          iban: string | null
          notes: string | null
          payout_email: string | null
          sort_code: string | null
          swift_bic: string | null
          tax_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          country?: string | null
          created_at?: string
          iban?: string | null
          notes?: string | null
          payout_email?: string | null
          sort_code?: string | null
          swift_bic?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          country?: string | null
          created_at?: string
          iban?: string | null
          notes?: string | null
          payout_email?: string | null
          sort_code?: string | null
          swift_bic?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deal_applications: {
        Row: {
          approved_code: string | null
          auto_decided: boolean
          auto_decision_reason: string | null
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
          auto_decided?: boolean
          auto_decision_reason?: string | null
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
          auto_decided?: boolean
          auto_decision_reason?: string | null
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
      deal_blocked_dates: {
        Row: {
          booking_id: string | null
          created_at: string
          date: string
          deal_id: string
          external_calendar_id: string | null
          id: string
          source: string
          summary: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          date: string
          deal_id: string
          external_calendar_id?: string | null
          id?: string
          source: string
          summary?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          date?: string
          deal_id?: string
          external_calendar_id?: string | null
          id?: string
          source?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_blocked_dates_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_blocked_dates_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_blocked_dates_external_calendar_id_fkey"
            columns: ["external_calendar_id"]
            isOneToOne: false
            referencedRelation: "deal_external_calendars"
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
      deal_external_calendars: {
        Row: {
          created_at: string
          deal_id: string
          ics_url: string
          id: string
          last_error: string | null
          last_status: string | null
          last_synced_at: string | null
          name: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          ics_url: string
          id?: string
          last_error?: string | null
          last_status?: string | null
          last_synced_at?: string | null
          name: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          ics_url?: string
          id?: string
          last_error?: string | null
          last_status?: string | null
          last_synced_at?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_external_calendars_deal_id_fkey"
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
      deal_rate_plans: {
        Row: {
          breakfast: string
          cancellation_policy_code: string
          compare_at_price_cents: number | null
          created_at: string
          currency: string
          deal_id: string
          deposit_pct: number | null
          discount_label: string | null
          guests_included: number
          id: string
          is_active: boolean
          name: string
          payment_timing: string
          perks: Json
          price_cents: number
          room_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          breakfast?: string
          cancellation_policy_code?: string
          compare_at_price_cents?: number | null
          created_at?: string
          currency?: string
          deal_id: string
          deposit_pct?: number | null
          discount_label?: string | null
          guests_included?: number
          id?: string
          is_active?: boolean
          name: string
          payment_timing?: string
          perks?: Json
          price_cents: number
          room_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          breakfast?: string
          cancellation_policy_code?: string
          compare_at_price_cents?: number | null
          created_at?: string
          currency?: string
          deal_id?: string
          deposit_pct?: number | null
          discount_label?: string | null
          guests_included?: number
          id?: string
          is_active?: boolean
          name?: string
          payment_timing?: string
          perks?: Json
          price_cents?: number
          room_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_rate_plans_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_rate_plans_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "deal_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_redemptions: {
        Row: {
          booking_id: string | null
          code: string
          commission_cents: number | null
          commission_rate: number | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          creator_commission_cents: number | null
          creator_id: string | null
          creator_share_pct: number | null
          creator_tier: string | null
          currency: string
          deal_id: string
          id: string
          match_code: string | null
          matched_from_price_cents: number | null
          notes: string | null
          order_value_cents: number | null
          payout_run_id: string | null
          platform_commission_cents: number | null
          platform_share_pct: number | null
          status: Database["public"]["Enums"]["deal_redemption_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          booking_id?: string | null
          code: string
          commission_cents?: number | null
          commission_rate?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          creator_commission_cents?: number | null
          creator_id?: string | null
          creator_share_pct?: number | null
          creator_tier?: string | null
          currency?: string
          deal_id: string
          id?: string
          match_code?: string | null
          matched_from_price_cents?: number | null
          notes?: string | null
          order_value_cents?: number | null
          payout_run_id?: string | null
          platform_commission_cents?: number | null
          platform_share_pct?: number | null
          status?: Database["public"]["Enums"]["deal_redemption_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          booking_id?: string | null
          code?: string
          commission_cents?: number | null
          commission_rate?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          creator_commission_cents?: number | null
          creator_id?: string | null
          creator_share_pct?: number | null
          creator_tier?: string | null
          currency?: string
          deal_id?: string
          id?: string
          match_code?: string | null
          matched_from_price_cents?: number | null
          notes?: string | null
          order_value_cents?: number | null
          payout_run_id?: string | null
          platform_commission_cents?: number | null
          platform_share_pct?: number | null
          status?: Database["public"]["Enums"]["deal_redemption_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_redemptions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_redemptions_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_redemptions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_redemptions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_redemptions_payout_run_id_fkey"
            columns: ["payout_run_id"]
            isOneToOne: false
            referencedRelation: "payout_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_redemptions_user_id_fkey"
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
      deal_rooms: {
        Row: {
          bed_config: Json
          created_at: string
          deal_id: string
          description: string | null
          duration_minutes: number | null
          excludes: string[] | null
          id: string
          includes: string[] | null
          inventory_remaining: number | null
          inventory_total: number | null
          is_active: boolean
          item_kind: string
          languages: string[] | null
          max_group_size: number | null
          max_guests: number
          meeting_point: string | null
          min_group_size: number | null
          name: string
          photos: Json
          room_size_sqm: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          bed_config?: Json
          created_at?: string
          deal_id: string
          description?: string | null
          duration_minutes?: number | null
          excludes?: string[] | null
          id?: string
          includes?: string[] | null
          inventory_remaining?: number | null
          inventory_total?: number | null
          is_active?: boolean
          item_kind?: string
          languages?: string[] | null
          max_group_size?: number | null
          max_guests?: number
          meeting_point?: string | null
          min_group_size?: number | null
          name: string
          photos?: Json
          room_size_sqm?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          bed_config?: Json
          created_at?: string
          deal_id?: string
          description?: string | null
          duration_minutes?: number | null
          excludes?: string[] | null
          id?: string
          includes?: string[] | null
          inventory_remaining?: number | null
          inventory_total?: number | null
          is_active?: boolean
          item_kind?: string
          languages?: string[] | null
          max_group_size?: number | null
          max_guests?: number
          meeting_point?: string | null
          min_group_size?: number | null
          name?: string
          photos?: Json
          room_size_sqm?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_rooms_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_time_slots: {
        Row: {
          booked: number
          capacity: number
          created_at: string
          deal_id: string
          ends_at: string
          id: string
          is_active: boolean
          room_id: string | null
          starts_at: string
          updated_at: string
        }
        Insert: {
          booked?: number
          capacity?: number
          created_at?: string
          deal_id: string
          ends_at: string
          id?: string
          is_active?: boolean
          room_id?: string | null
          starts_at: string
          updated_at?: string
        }
        Update: {
          booked?: number
          capacity?: number
          created_at?: string
          deal_id?: string
          ends_at?: string
          id?: string
          is_active?: boolean
          room_id?: string | null
          starts_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          affiliate_network: string | null
          ai_confidence: number | null
          ai_summary: string | null
          bookable: boolean
          business_id: string | null
          cancellation_policy_code: string
          category: Database["public"]["Enums"]["deal_category"]
          city: string | null
          click_count: number
          connect_account_id: string | null
          country: string | null
          created_at: string
          currency: string | null
          deal_rating_avg: number | null
          deal_rating_count: number
          description: string | null
          destination: string | null
          discount_label: string | null
          discovered_at: string | null
          embedded_at: string | null
          embedding: string | null
          ends_at: string | null
          ical_token: string | null
          id: string
          image_url: string | null
          inventory_mode: string
          inventory_remaining: number | null
          is_active: boolean
          last_seen_at: string | null
          lat: number | null
          lng: number | null
          operator_base_price_cents: number | null
          operator_site_host: string | null
          operator_site_url: string | null
          original_url: string | null
          parity_exempt: boolean
          parity_exempt_reason: string | null
          price_cents: number | null
          pricing_model: Database["public"]["Enums"]["deal_pricing_model"]
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
          bookable?: boolean
          business_id?: string | null
          cancellation_policy_code?: string
          category?: Database["public"]["Enums"]["deal_category"]
          city?: string | null
          click_count?: number
          connect_account_id?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          deal_rating_avg?: number | null
          deal_rating_count?: number
          description?: string | null
          destination?: string | null
          discount_label?: string | null
          discovered_at?: string | null
          embedded_at?: string | null
          embedding?: string | null
          ends_at?: string | null
          ical_token?: string | null
          id?: string
          image_url?: string | null
          inventory_mode?: string
          inventory_remaining?: number | null
          is_active?: boolean
          last_seen_at?: string | null
          lat?: number | null
          lng?: number | null
          operator_base_price_cents?: number | null
          operator_site_host?: string | null
          operator_site_url?: string | null
          original_url?: string | null
          parity_exempt?: boolean
          parity_exempt_reason?: string | null
          price_cents?: number | null
          pricing_model?: Database["public"]["Enums"]["deal_pricing_model"]
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
          bookable?: boolean
          business_id?: string | null
          cancellation_policy_code?: string
          category?: Database["public"]["Enums"]["deal_category"]
          city?: string | null
          click_count?: number
          connect_account_id?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          deal_rating_avg?: number | null
          deal_rating_count?: number
          description?: string | null
          destination?: string | null
          discount_label?: string | null
          discovered_at?: string | null
          embedded_at?: string | null
          embedding?: string | null
          ends_at?: string | null
          ical_token?: string | null
          id?: string
          image_url?: string | null
          inventory_mode?: string
          inventory_remaining?: number | null
          is_active?: boolean
          last_seen_at?: string | null
          lat?: number | null
          lng?: number | null
          operator_base_price_cents?: number | null
          operator_site_host?: string | null
          operator_site_url?: string | null
          original_url?: string | null
          parity_exempt?: boolean
          parity_exempt_reason?: string | null
          price_cents?: number | null
          pricing_model?: Database["public"]["Enums"]["deal_pricing_model"]
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
      email_preferences: {
        Row: {
          notify_applications: boolean
          notify_expiry: boolean
          notify_redemption: boolean
          notify_social: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          notify_applications?: boolean
          notify_expiry?: boolean
          notify_redemption?: boolean
          notify_social?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          notify_applications?: boolean
          notify_expiry?: boolean
          notify_redemption?: boolean
          notify_social?: boolean
          updated_at?: string
          user_id?: string
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
      fx_rates: {
        Row: {
          base: string
          fetched_at: string
          quote: string
          rate: number
        }
        Insert: {
          base: string
          fetched_at?: string
          quote: string
          rate: number
        }
        Update: {
          base?: string
          fetched_at?: string
          quote?: string
          rate?: number
        }
        Relationships: []
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
      launch_waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          platform: string
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          platform: string
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          platform?: string
          source?: string | null
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
      notification_preferences: {
        Row: {
          created_at: string
          notify_deal_expiring: boolean
          notify_followers: boolean
          notify_replies: boolean
          notify_weekly_digest: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          notify_deal_expiring?: boolean
          notify_followers?: boolean
          notify_replies?: boolean
          notify_weekly_digest?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          notify_deal_expiring?: boolean
          notify_followers?: boolean
          notify_replies?: boolean
          notify_weekly_digest?: boolean
          updated_at?: string
          user_id?: string
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
          redemption_id: string | null
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
          redemption_id?: string | null
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
          redemption_id?: string | null
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
      parity_checks: {
        Row: {
          action: string
          cheapest_competitor_cents: number | null
          cheapest_competitor_network: string | null
          cheapest_competitor_url: string | null
          cheapest_network: string | null
          cheapest_price_cents: number | null
          check_in: string | null
          check_out: string | null
          deal_id: string | null
          direct_price_cents: number | null
          fx_quote_currency: string | null
          fx_rate_used: number | null
          guests: number | null
          id: string
          link_id: string | null
          normalised_competitor_price_cents: number | null
          providers_checked: string[]
          ran_at: string
          scanned_urls: Json
        }
        Insert: {
          action: string
          cheapest_competitor_cents?: number | null
          cheapest_competitor_network?: string | null
          cheapest_competitor_url?: string | null
          cheapest_network?: string | null
          cheapest_price_cents?: number | null
          check_in?: string | null
          check_out?: string | null
          deal_id?: string | null
          direct_price_cents?: number | null
          fx_quote_currency?: string | null
          fx_rate_used?: number | null
          guests?: number | null
          id?: string
          link_id?: string | null
          normalised_competitor_price_cents?: number | null
          providers_checked?: string[]
          ran_at?: string
          scanned_urls?: Json
        }
        Update: {
          action?: string
          cheapest_competitor_cents?: number | null
          cheapest_competitor_network?: string | null
          cheapest_competitor_url?: string | null
          cheapest_network?: string | null
          cheapest_price_cents?: number | null
          check_in?: string | null
          check_out?: string | null
          deal_id?: string | null
          direct_price_cents?: number | null
          fx_quote_currency?: string | null
          fx_rate_used?: number | null
          guests?: number | null
          id?: string
          link_id?: string | null
          normalised_competitor_price_cents?: number | null
          providers_checked?: string[]
          ran_at?: string
          scanned_urls?: Json
        }
        Relationships: []
      }
      partner_clicks: {
        Row: {
          business_id: string | null
          city: string | null
          click_ref: string
          created_at: string
          deal_id: string | null
          destination_url: string
          id: string
          partner: string
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          city?: string | null
          click_ref: string
          created_at?: string
          deal_id?: string | null
          destination_url: string
          id?: string
          partner: string
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          city?: string | null
          click_ref?: string
          created_at?: string
          deal_id?: string | null
          destination_url?: string
          id?: string
          partner?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payout_line_items: {
        Row: {
          commission_cents: number
          created_at: string
          creator_id: string
          currency: string
          id: string
          payout_run_id: string
          redemption_id: string
        }
        Insert: {
          commission_cents: number
          created_at?: string
          creator_id: string
          currency?: string
          id?: string
          payout_run_id: string
          redemption_id: string
        }
        Update: {
          commission_cents?: number
          created_at?: string
          creator_id?: string
          currency?: string
          id?: string
          payout_run_id?: string
          redemption_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_line_items_payout_run_id_fkey"
            columns: ["payout_run_id"]
            isOneToOne: false
            referencedRelation: "payout_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_runs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          creator_id: string
          currency: string
          external_reference: string | null
          id: string
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          period_end: string
          period_start: string
          redemption_count: number
          status: string
          total_cents: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          creator_id: string
          currency?: string
          external_reference?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          period_end: string
          period_start: string
          redemption_count?: number
          status?: string
          total_cents?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          creator_id?: string
          currency?: string
          external_reference?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          period_end?: string
          period_start?: string
          redemption_count?: number
          status?: string
          total_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      price_match_codes: {
        Row: {
          business_id: string | null
          code: string
          competitor_network: string
          competitor_url: string
          currency: string
          deal_id: string | null
          dispute_evidence_url: string | null
          dispute_reason: string | null
          dispute_resolved_at: string | null
          dispute_resolved_by: string | null
          evidence_hash: string | null
          evidence_url: string | null
          expires_at: string
          issued_at: string
          link_id: string | null
          matched_price_cents: number
          original_price_cents: number
          redeemed_at: string | null
          status: Database["public"]["Enums"]["price_match_status"]
          traveller_user_id: string | null
        }
        Insert: {
          business_id?: string | null
          code: string
          competitor_network: string
          competitor_url: string
          currency?: string
          deal_id?: string | null
          dispute_evidence_url?: string | null
          dispute_reason?: string | null
          dispute_resolved_at?: string | null
          dispute_resolved_by?: string | null
          evidence_hash?: string | null
          evidence_url?: string | null
          expires_at: string
          issued_at?: string
          link_id?: string | null
          matched_price_cents: number
          original_price_cents: number
          redeemed_at?: string | null
          status?: Database["public"]["Enums"]["price_match_status"]
          traveller_user_id?: string | null
        }
        Update: {
          business_id?: string | null
          code?: string
          competitor_network?: string
          competitor_url?: string
          currency?: string
          deal_id?: string | null
          dispute_evidence_url?: string | null
          dispute_reason?: string | null
          dispute_resolved_at?: string | null
          dispute_resolved_by?: string | null
          evidence_hash?: string | null
          evidence_url?: string | null
          expires_at?: string
          issued_at?: string
          link_id?: string | null
          matched_price_cents?: number
          original_price_cents?: number
          redeemed_at?: string | null
          status?: Database["public"]["Enums"]["price_match_status"]
          traveller_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_match_codes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      price_quotes: {
        Row: {
          check_in: string | null
          check_out: string | null
          currency: string
          evidence_hash: string | null
          evidence_url: string | null
          fetched_at: string
          id: string
          link_id: string
          network: string
          pax: number | null
          price_cents: number
          source: string
          ttl_seconds: number
          url: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          currency?: string
          evidence_hash?: string | null
          evidence_url?: string | null
          fetched_at?: string
          id?: string
          link_id: string
          network: string
          pax?: number | null
          price_cents: number
          source?: string
          ttl_seconds?: number
          url: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          currency?: string
          evidence_hash?: string | null
          evidence_url?: string | null
          fetched_at?: string
          id?: string
          link_id?: string
          network?: string
          pax?: number | null
          price_cents?: number
          source?: string
          ttl_seconds?: number
          url?: string
        }
        Relationships: []
      }
      profile_socials: {
        Row: {
          facebook_handle: string | null
          instagram_handle: string | null
          show_social_links: boolean
          tiktok_handle: string | null
          updated_at: string
          user_id: string
          website_url: string | null
          x_handle: string | null
          youtube_channel_id: string | null
          youtube_handle: string | null
        }
        Insert: {
          facebook_handle?: string | null
          instagram_handle?: string | null
          show_social_links?: boolean
          tiktok_handle?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
          x_handle?: string | null
          youtube_channel_id?: string | null
          youtube_handle?: string | null
        }
        Update: {
          facebook_handle?: string | null
          instagram_handle?: string | null
          show_social_links?: boolean
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
          address: string | null
          avatar_url: string | null
          bio: string | null
          business_agreement_accepted_at: string | null
          business_city: string | null
          business_country: string | null
          business_logo_url: string | null
          business_name: string | null
          business_rating_avg: number | null
          business_rating_count: number
          business_rating_refreshed_at: string | null
          business_website_url: string | null
          created_at: string
          creator_agreement_accepted_at: string | null
          creator_joined_at: string | null
          creator_quality_refreshed_at: string | null
          creator_quality_score: number | null
          creator_rating_avg: number | null
          creator_rating_count: number
          display_name: string | null
          founding_creator_number: number | null
          id: string
          is_founding_creator: boolean
          is_restaurant: boolean
          is_verified: boolean
          lat: number | null
          lng: number | null
          operator_site_host: string | null
          operator_site_url: string | null
          payout_bank_details_encrypted: string | null
          payout_method: string
          place_name: string | null
          power_tier_last_qualified_at: string | null
          power_tier_locked_at: string | null
          rolling_12mo_gbv_cents: number
          rolling_12mo_gbv_refreshed_at: string | null
          stripe_connect_account_id: string | null
          stripe_connect_charges_enabled: boolean
          stripe_connect_country: string | null
          stripe_connect_default_currency: string | null
          stripe_connect_payouts_enabled: boolean
          stripe_connect_requirements: Json | null
          stripe_connect_status: string
          stripe_connect_updated_at: string | null
          thefork_url: string | null
          username: string
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          business_agreement_accepted_at?: string | null
          business_city?: string | null
          business_country?: string | null
          business_logo_url?: string | null
          business_name?: string | null
          business_rating_avg?: number | null
          business_rating_count?: number
          business_rating_refreshed_at?: string | null
          business_website_url?: string | null
          created_at?: string
          creator_agreement_accepted_at?: string | null
          creator_joined_at?: string | null
          creator_quality_refreshed_at?: string | null
          creator_quality_score?: number | null
          creator_rating_avg?: number | null
          creator_rating_count?: number
          display_name?: string | null
          founding_creator_number?: number | null
          id: string
          is_founding_creator?: boolean
          is_restaurant?: boolean
          is_verified?: boolean
          lat?: number | null
          lng?: number | null
          operator_site_host?: string | null
          operator_site_url?: string | null
          payout_bank_details_encrypted?: string | null
          payout_method?: string
          place_name?: string | null
          power_tier_last_qualified_at?: string | null
          power_tier_locked_at?: string | null
          rolling_12mo_gbv_cents?: number
          rolling_12mo_gbv_refreshed_at?: string | null
          stripe_connect_account_id?: string | null
          stripe_connect_charges_enabled?: boolean
          stripe_connect_country?: string | null
          stripe_connect_default_currency?: string | null
          stripe_connect_payouts_enabled?: boolean
          stripe_connect_requirements?: Json | null
          stripe_connect_status?: string
          stripe_connect_updated_at?: string | null
          thefork_url?: string | null
          username: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          business_agreement_accepted_at?: string | null
          business_city?: string | null
          business_country?: string | null
          business_logo_url?: string | null
          business_name?: string | null
          business_rating_avg?: number | null
          business_rating_count?: number
          business_rating_refreshed_at?: string | null
          business_website_url?: string | null
          created_at?: string
          creator_agreement_accepted_at?: string | null
          creator_joined_at?: string | null
          creator_quality_refreshed_at?: string | null
          creator_quality_score?: number | null
          creator_rating_avg?: number | null
          creator_rating_count?: number
          display_name?: string | null
          founding_creator_number?: number | null
          id?: string
          is_founding_creator?: boolean
          is_restaurant?: boolean
          is_verified?: boolean
          lat?: number | null
          lng?: number | null
          operator_site_host?: string | null
          operator_site_url?: string | null
          payout_bank_details_encrypted?: string | null
          payout_method?: string
          place_name?: string | null
          power_tier_last_qualified_at?: string | null
          power_tier_locked_at?: string | null
          rolling_12mo_gbv_cents?: number
          rolling_12mo_gbv_refreshed_at?: string | null
          stripe_connect_account_id?: string | null
          stripe_connect_charges_enabled?: boolean
          stripe_connect_country?: string | null
          stripe_connect_default_currency?: string | null
          stripe_connect_payouts_enabled?: boolean
          stripe_connect_requirements?: Json | null
          stripe_connect_status?: string
          stripe_connect_updated_at?: string | null
          thefork_url?: string | null
          username?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          id: string
          onesignal_player_id: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          onesignal_player_id: string
          platform: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          onesignal_player_id?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limit_hits: {
        Row: {
          action: string
          actor_key: string
          created_at: string
          id: string
        }
        Insert: {
          action: string
          actor_key: string
          created_at?: string
          id?: string
        }
        Update: {
          action?: string
          actor_key?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      review_flags: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          review_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          review_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_flags_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "booking_reviews"
            referencedColumns: ["id"]
          },
        ]
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
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          founding_member_number: number | null
          id: string
          is_founding_member: boolean | null
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          founding_member_number?: number | null
          id?: string
          is_founding_member?: boolean | null
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          founding_member_number?: number | null
          id?: string
          is_founding_member?: boolean | null
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
          bumped_at: string | null
          captions_ready: boolean
          city: string | null
          comment_count: number
          country: string | null
          created_at: string
          creator_id: string
          cross_links: Json
          description: string | null
          destination: string | null
          duration_sec: number | null
          embed_mode: string
          embedded_at: string | null
          embedding: string | null
          id: string
          is_demo: boolean
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
          bumped_at?: string | null
          captions_ready?: boolean
          city?: string | null
          comment_count?: number
          country?: string | null
          created_at?: string
          creator_id: string
          cross_links?: Json
          description?: string | null
          destination?: string | null
          duration_sec?: number | null
          embed_mode?: string
          embedded_at?: string | null
          embedding?: string | null
          id?: string
          is_demo?: boolean
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
          bumped_at?: string | null
          captions_ready?: boolean
          city?: string | null
          comment_count?: number
          country?: string | null
          created_at?: string
          creator_id?: string
          cross_links?: Json
          description?: string | null
          destination?: string | null
          duration_sec?: number | null
          embed_mode?: string
          embedded_at?: string | null
          embedding?: string | null
          id?: string
          is_demo?: boolean
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
      creator_earnings_monthly: {
        Row: {
          commission_cents_total: number | null
          creator_id: string | null
          gross_order_cents: number | null
          month: string | null
          payable_cents: number | null
          pending_cents: number | null
          redemption_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_redemptions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_rate_limit: {
        Args: {
          _action: string
          _actor_key: string
          _max_per_window: number
          _window_seconds: number
        }
        Returns: boolean
      }
      cron_expire_deals: { Args: never; Returns: number }
      cron_publish_scheduled_videos: { Args: never; Returns: number }
      decrypt_bank_details: { Args: { c: string }; Returns: Json }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_has_account: { Args: { _email: string }; Returns: boolean }
      encrypt_bank_details: { Args: { p: Json }; Returns: string }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_draft_payout_runs: {
        Args: {
          _min_payout_cents?: number
          _period_end?: string
          _period_start?: string
        }
        Returns: {
          creator_id: string
          redemption_count: number
          run_id: string
          total_cents: number
        }[]
      }
      get_thread_for_invite: { Args: { _token: string }; Returns: Json }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
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
      notify_expiring_deals: { Args: never; Returns: number }
      post_thread_reply_with_token: {
        Args: { _body: string; _sender_email?: string; _token: string }
        Returns: Json
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      refresh_creator_quality: { Args: never; Returns: number }
      refresh_creator_tiers: { Args: never; Returns: number }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      affiliate_link_kind:
        | "creator_affiliate"
        | "ota_affiliate"
        | "direct_business"
      app_role: "traveller" | "creator" | "business" | "admin"
      deal_application_status: "pending" | "approved" | "declined" | "withdrawn"
      deal_category: "stay" | "eat" | "do" | "tour" | "transport" | "other"
      deal_pricing_model: "commission" | "operator_markup"
      deal_redemption_status: "pending" | "confirmed" | "rejected"
      notification_type:
        | "like"
        | "comment"
        | "follow"
        | "reply"
        | "deal_application"
        | "deal_application_decided"
        | "business_invite_received"
        | "redemption_confirmed"
        | "redemption_rejected"
        | "deal_expiring_soon"
        | "business_thread_message"
        | "business_invite_accepted"
        | "business_invite_declined"
      price_match_status:
        | "issued"
        | "redeemed"
        | "expired"
        | "disputed"
        | "dispute_rejected"
      supplier_type:
        | "hotel"
        | "activity"
        | "flight"
        | "transfer"
        | "esim"
        | "other"
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
      affiliate_link_kind: [
        "creator_affiliate",
        "ota_affiliate",
        "direct_business",
      ],
      app_role: ["traveller", "creator", "business", "admin"],
      deal_application_status: ["pending", "approved", "declined", "withdrawn"],
      deal_category: ["stay", "eat", "do", "tour", "transport", "other"],
      deal_pricing_model: ["commission", "operator_markup"],
      deal_redemption_status: ["pending", "confirmed", "rejected"],
      notification_type: [
        "like",
        "comment",
        "follow",
        "reply",
        "deal_application",
        "deal_application_decided",
        "business_invite_received",
        "redemption_confirmed",
        "redemption_rejected",
        "deal_expiring_soon",
        "business_thread_message",
        "business_invite_accepted",
        "business_invite_declined",
      ],
      price_match_status: [
        "issued",
        "redeemed",
        "expired",
        "disputed",
        "dispute_rejected",
      ],
      supplier_type: [
        "hotel",
        "activity",
        "flight",
        "transfer",
        "esim",
        "other",
      ],
    },
  },
} as const
