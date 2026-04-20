export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agent_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          model: string | null
          session_id: string
          status: string
          thread_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          model?: string | null
          session_id: string
          status: string
          thread_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          model?: string | null
          session_id?: string
          status?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_objects: {
        Row: {
          bucket: string
          byte_size: number | null
          created_at: string
          created_by: string | null
          id: string
          mime_type: string | null
          object_path: string
          project_id: string | null
          workspace_id: string
        }
        Insert: {
          bucket: string
          byte_size?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          mime_type?: string | null
          object_path: string
          project_id?: string | null
          workspace_id: string
        }
        Update: {
          bucket?: string
          byte_size?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          mime_type?: string | null
          object_path?: string
          project_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_objects_project_workspace_fkey"
            columns: ["project_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "asset_objects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      background_jobs: {
        Row: {
          attempt_count: number
          canceled_at: string | null
          canvas_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          credits_cost: number | null
          credits_transaction_id: string | null
          error_code: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          job_type: Database["public"]["Enums"]["background_job_type"]
          max_attempts: number
          payload: Json
          project_id: string | null
          queue_name: string
          result: Json | null
          session_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["background_job_status"]
          thread_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          attempt_count?: number
          canceled_at?: string | null
          canvas_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          credits_cost?: number | null
          credits_transaction_id?: string | null
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          job_type: Database["public"]["Enums"]["background_job_type"]
          max_attempts?: number
          payload?: Json
          project_id?: string | null
          queue_name: string
          result?: Json | null
          session_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["background_job_status"]
          thread_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          attempt_count?: number
          canceled_at?: string | null
          canvas_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          credits_cost?: number | null
          credits_transaction_id?: string | null
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          job_type?: Database["public"]["Enums"]["background_job_type"]
          max_attempts?: number
          payload?: Json
          project_id?: string | null
          queue_name?: string
          result?: Json | null
          session_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["background_job_status"]
          thread_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "background_jobs_canvas_id_fkey"
            columns: ["canvas_id"]
            isOneToOne: false
            referencedRelation: "canvases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "background_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "background_jobs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "background_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kit_assets: {
        Row: {
          asset_type: Database["public"]["Enums"]["brand_kit_asset_type"]
          created_at: string
          display_name: string
          file_url: string | null
          id: string
          kit_id: string
          metadata: Json | null
          role: string | null
          sort_order: number
          text_content: string | null
          updated_at: string
        }
        Insert: {
          asset_type: Database["public"]["Enums"]["brand_kit_asset_type"]
          created_at?: string
          display_name?: string
          file_url?: string | null
          id?: string
          kit_id: string
          metadata?: Json | null
          role?: string | null
          sort_order?: number
          text_content?: string | null
          updated_at?: string
        }
        Update: {
          asset_type?: Database["public"]["Enums"]["brand_kit_asset_type"]
          created_at?: string
          display_name?: string
          file_url?: string | null
          id?: string
          kit_id?: string
          metadata?: Json | null
          role?: string | null
          sort_order?: number
          text_content?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_assets_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kits: {
        Row: {
          cover_url: string | null
          created_at: string
          guidance_text: string | null
          id: string
          is_default: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          guidance_text?: string | null
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          guidance_text?: string | null
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      canvases: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          id: string
          is_primary: boolean
          name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "canvases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          content_blocks: Json | null
          created_at: string
          id: string
          role: string
          session_id: string
          tool_activities: Json | null
        }
        Insert: {
          content?: string
          content_blocks?: Json | null
          created_at?: string
          id?: string
          role: string
          session_id: string
          tool_activities?: Json | null
        }
        Update: {
          content?: string
          content_blocks?: Json | null
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          tool_activities?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          canvas_id: string
          created_at: string
          created_by: string | null
          id: string
          thread_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          canvas_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          thread_id?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          canvas_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          thread_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_canvas_id_fkey"
            columns: ["canvas_id"]
            isOneToOne: false
            referencedRelation: "canvases"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_balances: {
        Row: {
          balance: number
          id: string
          updated_at: string
          version: number
          workspace_id: string
        }
        Insert: {
          balance?: number
          id?: string
          updated_at?: string
          version?: number
          workspace_id: string
        }
        Update: {
          balance?: number
          id?: string
          updated_at?: string
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_balances_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          job_id: string | null
          metadata: Json | null
          transaction_type: Database["public"]["Enums"]["credit_transaction_type"]
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          transaction_type: Database["public"]["Enums"]["credit_transaction_type"]
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          transaction_type?: Database["public"]["Enums"]["credit_transaction_type"]
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "background_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_credit_claims: {
        Row: {
          amount: number
          claim_date: string
          created_at: string
          id: string
          workspace_id: string
        }
        Insert: {
          amount: number
          claim_date?: string
          created_at?: string
          id?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          claim_date?: string
          created_at?: string
          id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_credit_claims_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      home_discovery_cases: {
        Row: {
          author_avatar_url: string
          author_name: string
          case_url: string
          category_key: string
          cover_image_url: string
          created_at: string
          id: string
          is_active: boolean
          like_count: number
          seed_prompt: string
          sort_order: number
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_avatar_url: string
          author_name: string
          case_url: string
          category_key: string
          cover_image_url: string
          created_at?: string
          id: string
          is_active?: boolean
          like_count?: number
          seed_prompt?: string
          sort_order?: number
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_avatar_url?: string
          author_name?: string
          case_url?: string
          category_key?: string
          cover_image_url?: string
          created_at?: string
          id?: string
          is_active?: boolean
          like_count?: number
          seed_prompt?: string
          sort_order?: number
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "home_discovery_cases_category_key_fkey"
            columns: ["category_key"]
            isOneToOne: false
            referencedRelation: "home_discovery_categories"
            referencedColumns: ["key"]
          },
        ]
      }
      home_discovery_categories: {
        Row: {
          created_at: string
          is_active: boolean
          key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      home_example_categories: {
        Row: {
          accent: string | null
          created_at: string
          data_type: string
          is_active: boolean
          key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          accent?: string | null
          created_at?: string
          data_type: string
          is_active?: boolean
          key: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          accent?: string | null
          created_at?: string
          data_type?: string
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      home_example_examples: {
        Row: {
          category_key: string
          created_at: string
          id: string
          image_urls: string[]
          input_mentions: Json
          is_active: boolean
          prompt: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category_key: string
          created_at?: string
          id?: string
          image_urls?: string[]
          input_mentions?: Json
          is_active?: boolean
          prompt: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category_key?: string
          created_at?: string
          id?: string
          image_urls?: string[]
          input_mentions?: Json
          is_active?: boolean
          prompt?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_example_examples_category_key_fkey"
            columns: ["category_key"]
            isOneToOne: false
            referencedRelation: "home_example_categories"
            referencedColumns: ["key"]
          },
        ]
      }
      payment_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_name: string
          id: string
          lemon_squeezy_event_id: string | null
          payload: Json
          processed: boolean
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_name: string
          id?: string
          lemon_squeezy_event_id?: string | null
          payload?: Json
          processed?: boolean
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_name?: string
          id?: string
          lemon_squeezy_event_id?: string | null
          payload?: Json
          processed?: boolean
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          archived_at: string | null
          brand_kit_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          slug: string
          thumbnail_path: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          brand_kit_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          thumbnail_path?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          brand_kit_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          thumbnail_path?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_template_categories: {
        Row: {
          created_at: string
          depth: number
          is_active: boolean
          key: string
          name: string
          parent_key: string | null
          sort_order: number
          source_catalog_id: string
          template_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          depth: number
          is_active?: boolean
          key: string
          name: string
          parent_key?: string | null
          sort_order?: number
          source_catalog_id: string
          template_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          depth?: number
          is_active?: boolean
          key?: string
          name?: string
          parent_key?: string | null
          sort_order?: number
          source_catalog_id?: string
          template_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_template_categories_parent_key_fkey"
            columns: ["parent_key"]
            isOneToOne: false
            referencedRelation: "prompt_template_categories"
            referencedColumns: ["key"]
          },
        ]
      }
      prompt_template_favorites: {
        Row: {
          created_at: string
          template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          template_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_template_favorites_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "prompt_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_template_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_templates: {
        Row: {
          aspect_ratio: string | null
          collect_count: number
          cover_image_url: string
          created_at: string
          height: number | null
          id: string
          is_active: boolean
          leaf_category_key: string
          output_image_url: string | null
          preview_image_urls: string[]
          prompt_text: string
          reference_image_urls: string[]
          resolution: string | null
          sort_order: number
          source_catalog_paths: Json
          source_created_at_ms: number | null
          source_last_modified_at_ms: number | null
          source_template_id: string
          source_updated_at_ms: number | null
          title: string
          top_category_key: string
          updated_at: string
          use_count: number
          version_type: string | null
          view_count: number
          width: number | null
        }
        Insert: {
          aspect_ratio?: string | null
          collect_count?: number
          cover_image_url: string
          created_at?: string
          height?: number | null
          id: string
          is_active?: boolean
          leaf_category_key: string
          output_image_url?: string | null
          preview_image_urls?: string[]
          prompt_text: string
          reference_image_urls?: string[]
          resolution?: string | null
          sort_order?: number
          source_catalog_paths?: Json
          source_created_at_ms?: number | null
          source_last_modified_at_ms?: number | null
          source_template_id: string
          source_updated_at_ms?: number | null
          title: string
          top_category_key: string
          updated_at?: string
          use_count?: number
          version_type?: string | null
          view_count?: number
          width?: number | null
        }
        Update: {
          aspect_ratio?: string | null
          collect_count?: number
          cover_image_url?: string
          created_at?: string
          height?: number | null
          id?: string
          is_active?: boolean
          leaf_category_key?: string
          output_image_url?: string | null
          preview_image_urls?: string[]
          prompt_text?: string
          reference_image_urls?: string[]
          resolution?: string | null
          sort_order?: number
          source_catalog_paths?: Json
          source_created_at_ms?: number | null
          source_last_modified_at_ms?: number | null
          source_template_id?: string
          source_updated_at_ms?: number | null
          title?: string
          top_category_key?: string
          updated_at?: string
          use_count?: number
          version_type?: string | null
          view_count?: number
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_templates_leaf_category_key_fkey"
            columns: ["leaf_category_key"]
            isOneToOne: false
            referencedRelation: "prompt_template_categories"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "prompt_templates_top_category_key_fkey"
            columns: ["top_category_key"]
            isOneToOne: false
            referencedRelation: "prompt_template_categories"
            referencedColumns: ["key"]
          },
        ]
      }
      skill_files: {
        Row: {
          content: string
          created_at: string
          file_path: string
          id: string
          mime_type: string
          skill_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          file_path: string
          id?: string
          mime_type?: string
          skill_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          file_path?: string
          id?: string
          mime_type?: string
          skill_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_files_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          author: string
          category: string
          created_at: string
          created_by: string | null
          description: string
          icon_name: string | null
          id: string
          is_featured: boolean
          license: string | null
          metadata: Json | null
          name: string
          package_name: string | null
          skill_content: string
          slug: string
          source: string
          source_url: string | null
          updated_at: string
          version: string
        }
        Insert: {
          author?: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          icon_name?: string | null
          id?: string
          is_featured?: boolean
          license?: string | null
          metadata?: Json | null
          name: string
          package_name?: string | null
          skill_content: string
          slug: string
          source?: string
          source_url?: string | null
          updated_at?: string
          version?: string
        }
        Update: {
          author?: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          icon_name?: string | null
          id?: string
          is_featured?: boolean
          license?: string | null
          metadata?: Json | null
          name?: string
          package_name?: string | null
          skill_content?: string
          slug?: string
          source?: string
          source_url?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_period: Database["public"]["Enums"]["billing_period"] | null
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          lemon_squeezy_customer_id: string | null
          lemon_squeezy_order_id: string | null
          lemon_squeezy_subscription_id: string | null
          lemon_squeezy_variant_id: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          billing_period?: Database["public"]["Enums"]["billing_period"] | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          lemon_squeezy_customer_id?: string | null
          lemon_squeezy_order_id?: string | null
          lemon_squeezy_subscription_id?: string | null
          lemon_squeezy_variant_id?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          billing_period?: Database["public"]["Enums"]["billing_period"] | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          lemon_squeezy_customer_id?: string | null
          lemon_squeezy_order_id?: string | null
          lemon_squeezy_subscription_id?: string | null
          lemon_squeezy_variant_id?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["workspace_member_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["workspace_member_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["workspace_member_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_settings: {
        Row: {
          created_at: string
          default_model: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          default_model?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          default_model?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_skills: {
        Row: {
          config: Json | null
          enabled: boolean
          id: string
          installed_at: string
          installed_by: string | null
          skill_id: string
          workspace_id: string
        }
        Insert: {
          config?: Json | null
          enabled?: boolean
          id?: string
          installed_at?: string
          installed_by?: string | null
          skill_id: string
          workspace_id: string
        }
        Update: {
          config?: Json | null
          enabled?: boolean
          id?: string
          installed_at?: string
          installed_by?: string | null
          skill_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_skills_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
          type: Database["public"]["Enums"]["workspace_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
          type: Database["public"]["Enums"]["workspace_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          type?: Database["public"]["Enums"]["workspace_type"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_viewer: {
        Args: { p_email: string; p_user_id: string; p_user_meta: Json }
        Returns: string
      }
      claim_daily_credits: {
        Args: { p_amount: number; p_workspace_id: string }
        Returns: boolean
      }
      create_project_with_canvas: {
        Args: {
          p_canvas_name?: string
          p_description?: string
          p_name: string
          p_slug: string
          p_workspace_id: string
        }
        Returns: Json
      }
      deduct_credits: {
        Args: {
          p_amount: number
          p_description?: string
          p_job_id?: string
          p_user_id: string
          p_workspace_id: string
        }
        Returns: string
      }
      grant_plan_credits: {
        Args: {
          p_credits: number
          p_plan: Database["public"]["Enums"]["subscription_plan"]
          p_workspace_id: string
        }
        Returns: number
      }
      increment_job_attempt: {
        Args: { p_job_id: string }
        Returns: {
          attempt_count: number
          max_attempts: number
        }[]
      }
      refund_credits: {
        Args: {
          p_amount: number
          p_description?: string
          p_job_id: string
          p_user_id: string
          p_workspace_id: string
        }
        Returns: string
      }
    }
    Enums: {
      background_job_status:
        | "queued"
        | "running"
        | "succeeded"
        | "failed"
        | "canceled"
        | "dead_letter"
      background_job_type:
        | "image_generation"
        | "video_generation"
        | "code_execution"
      billing_period: "monthly" | "yearly"
      brand_kit_asset_type: "color" | "font" | "logo" | "image"
      credit_transaction_type:
        | "subscription_grant"
        | "daily_grant"
        | "purchase"
        | "generation_deduct"
        | "generation_refund"
        | "admin_adjustment"
        | "bonus"
      subscription_plan: "free" | "starter" | "pro" | "ultra" | "business"
      workspace_member_role: "owner" | "admin" | "member"
      workspace_type: "personal" | "team"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      iceberg_namespaces: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          metadata: Json
          name: string
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      iceberg_tables: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          location: string
          name: string
          namespace_id: string
          remote_table_id: string | null
          shard_id: string | null
          shard_key: string | null
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          namespace_id: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          namespace_id?: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey"
            columns: ["namespace_id"]
            isOneToOne: false
            referencedRelation: "iceberg_namespaces"
            referencedColumns: ["id"]
          },
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      background_job_status: [
        "queued",
        "running",
        "succeeded",
        "failed",
        "canceled",
        "dead_letter",
      ],
      background_job_type: [
        "image_generation",
        "video_generation",
        "code_execution",
      ],
      billing_period: ["monthly", "yearly"],
      brand_kit_asset_type: ["color", "font", "logo", "image"],
      credit_transaction_type: [
        "subscription_grant",
        "daily_grant",
        "purchase",
        "generation_deduct",
        "generation_refund",
        "admin_adjustment",
        "bonus",
      ],
      subscription_plan: ["free", "starter", "pro", "ultra", "business"],
      workspace_member_role: ["owner", "admin", "member"],
      workspace_type: ["personal", "team"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const

