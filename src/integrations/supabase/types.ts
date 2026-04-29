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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          entity: string
          entity_id: string | null
          id: string
          user_email: string
          user_id: string
          user_name: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          entity: string
          entity_id?: string | null
          id?: string
          user_email: string
          user_id: string
          user_name: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          entity?: string
          entity_id?: string | null
          id?: string
          user_email?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      ad_creatives: {
        Row: {
          client_id: string | null
          client_name: string
          completed_at: string | null
          completed_by_name: string | null
          completed_by_user_id: string | null
          created_at: string
          created_by_name: string
          created_by_user_id: string
          id: string
          image_url: string
          image_urls: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_name: string
          completed_at?: string | null
          completed_by_name?: string | null
          completed_by_user_id?: string | null
          created_at?: string
          created_by_name: string
          created_by_user_id: string
          id?: string
          image_url: string
          image_urls?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_name?: string
          completed_at?: string | null
          completed_by_name?: string | null
          completed_by_user_id?: string | null
          created_at?: string
          created_by_name?: string
          created_by_user_id?: string
          id?: string
          image_url?: string
          image_urls?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_creatives_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "operational_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_events: {
        Row: {
          assigned_closer_id: string | null
          client_name: string
          client_phone: string
          color: string | null
          created_at: string
          created_by_user_id: string | null
          description: string | null
          duration_minutes: number | null
          event_date: string
          event_time: string
          id: string
          meeting_link: string | null
          notes: string | null
          reminder_2h_sent: boolean | null
          reminder_30min_sent: boolean | null
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_closer_id?: string | null
          client_name: string
          client_phone: string
          color?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          duration_minutes?: number | null
          event_date: string
          event_time: string
          id?: string
          meeting_link?: string | null
          notes?: string | null
          reminder_2h_sent?: boolean | null
          reminder_30min_sent?: boolean | null
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_closer_id?: string | null
          client_name?: string
          client_phone?: string
          color?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          duration_minutes?: number | null
          event_date?: string
          event_time?: string
          id?: string
          meeting_link?: string | null
          notes?: string | null
          reminder_2h_sent?: boolean | null
          reminder_30min_sent?: boolean | null
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_events_assigned_closer_id_fkey"
            columns: ["assigned_closer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_events_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      agendamento_leads: {
        Row: {
          agendado_via: string | null
          created_at: string
          created_by_user_id: string | null
          data: string
          faturamento: string
          funil: string
          horario: string
          id: string
          nome: string
          pode_investir: string | null
          salao_ou_clinica: string | null
          status: string
          telefone: string
          tem_mkt: string
          tem_secretaria: string
          tem_socio: string
          updated_at: string
        }
        Insert: {
          agendado_via?: string | null
          created_at?: string
          created_by_user_id?: string | null
          data: string
          faturamento: string
          funil: string
          horario: string
          id?: string
          nome: string
          pode_investir?: string | null
          salao_ou_clinica?: string | null
          status: string
          telefone: string
          tem_mkt: string
          tem_secretaria?: string
          tem_socio: string
          updated_at?: string
        }
        Update: {
          agendado_via?: string | null
          created_at?: string
          created_by_user_id?: string | null
          data?: string
          faturamento?: string
          funil?: string
          horario?: string
          id?: string
          nome?: string
          pode_investir?: string | null
          salao_ou_clinica?: string | null
          status?: string
          telefone?: string
          tem_mkt?: string
          tem_secretaria?: string
          tem_socio?: string
          updated_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by_user_id: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          priority: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by_user_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by_user_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          bonus: string
          created_at: string
          created_by_user_id: string | null
          description: string
          difficulty: string
          id: string
          is_active: boolean
          sector: string
          title: string
          updated_at: string
        }
        Insert: {
          bonus: string
          created_at?: string
          created_by_user_id?: string | null
          description: string
          difficulty?: string
          id?: string
          is_active?: boolean
          sector?: string
          title: string
          updated_at?: string
        }
        Update: {
          bonus?: string
          created_at?: string
          created_by_user_id?: string | null
          description?: string
          difficulty?: string
          id?: string
          is_active?: boolean
          sector?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      championship_events: {
        Row: {
          client_name: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_type: string
          id: string
          item_label: string | null
          points: number
          team_id: string
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type: string
          id?: string
          item_label?: string | null
          points: number
          team_id: string
        }
        Update: {
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          item_label?: string | null
          points?: number
          team_id?: string
        }
        Relationships: []
      }
      championship_monthly_history: {
        Row: {
          created_at: string
          id: string
          items_sold: number
          losses: number
          month: string
          rank: number | null
          renewals: number
          team_id: string
          total_points: number
        }
        Insert: {
          created_at?: string
          id?: string
          items_sold?: number
          losses?: number
          month: string
          rank?: number | null
          renewals?: number
          team_id: string
          total_points?: number
        }
        Update: {
          created_at?: string
          id?: string
          items_sold?: number
          losses?: number
          month?: string
          rank?: number | null
          renewals?: number
          team_id?: string
          total_points?: number
        }
        Relationships: []
      }
      championship_teams: {
        Row: {
          badge_color: string
          created_at: string
          current_rank: number | null
          id: string
          items_sold: number
          label: string
          losses: number
          previous_rank: number | null
          renewals: number
          team_id: string
          total_points: number
          updated_at: string
        }
        Insert: {
          badge_color?: string
          created_at?: string
          current_rank?: number | null
          id?: string
          items_sold?: number
          label: string
          losses?: number
          previous_rank?: number | null
          renewals?: number
          team_id: string
          total_points?: number
          updated_at?: string
        }
        Update: {
          badge_color?: string
          created_at?: string
          current_rank?: number | null
          id?: string
          items_sold?: number
          label?: string
          losses?: number
          previous_rank?: number | null
          renewals?: number
          team_id?: string
          total_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      client_activity_tracking: {
        Row: {
          artes_count: number
          client_id: string
          created_at: string
          created_by_user_id: string | null
          designer_name: string | null
          id: string
          month: number
          updated_at: string
          week: number
          year: number
        }
        Insert: {
          artes_count?: number
          client_id: string
          created_at?: string
          created_by_user_id?: string | null
          designer_name?: string | null
          id?: string
          month: number
          updated_at?: string
          week: number
          year: number
        }
        Update: {
          artes_count?: number
          client_id?: string
          created_at?: string
          created_by_user_id?: string | null
          designer_name?: string | null
          id?: string
          month?: number
          updated_at?: string
          week?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_activity_tracking_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "operational_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_activity_tracking_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_files: {
        Row: {
          client_id: string
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          uploaded_by_user_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_by_user_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "operational_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_start_form_responses: {
        Row: {
          arquivos_identidade: string | null
          classe_social: string | null
          client_id: string
          concorrentes_instagram: string | null
          cores_marca: string | null
          created_at: string
          endereco: string | null
          facebook_login: string | null
          id: string
          idade_media: string | null
          info_adicional: string | null
          instagram_login: string | null
          interesses_publico: string | null
          nome_empresa: string | null
          numero_campanha: string | null
          possui_identidade_visual: string | null
          preferencia_tipografia: string | null
          produto_resultado: string | null
          produtos_servicos: string | null
          publico_alvo: string | null
          responsavel_projeto: string | null
          restricao_comunicacao: string | null
          submitted_by_user_id: string | null
          tabela_servicos: string | null
          ticket_medio: string | null
          updated_at: string
          valor_meta_ads: string | null
          valores_diretos_artes: string | null
        }
        Insert: {
          arquivos_identidade?: string | null
          classe_social?: string | null
          client_id: string
          concorrentes_instagram?: string | null
          cores_marca?: string | null
          created_at?: string
          endereco?: string | null
          facebook_login?: string | null
          id?: string
          idade_media?: string | null
          info_adicional?: string | null
          instagram_login?: string | null
          interesses_publico?: string | null
          nome_empresa?: string | null
          numero_campanha?: string | null
          possui_identidade_visual?: string | null
          preferencia_tipografia?: string | null
          produto_resultado?: string | null
          produtos_servicos?: string | null
          publico_alvo?: string | null
          responsavel_projeto?: string | null
          restricao_comunicacao?: string | null
          submitted_by_user_id?: string | null
          tabela_servicos?: string | null
          ticket_medio?: string | null
          updated_at?: string
          valor_meta_ads?: string | null
          valores_diretos_artes?: string | null
        }
        Update: {
          arquivos_identidade?: string | null
          classe_social?: string | null
          client_id?: string
          concorrentes_instagram?: string | null
          cores_marca?: string | null
          created_at?: string
          endereco?: string | null
          facebook_login?: string | null
          id?: string
          idade_media?: string | null
          info_adicional?: string | null
          instagram_login?: string | null
          interesses_publico?: string | null
          nome_empresa?: string | null
          numero_campanha?: string | null
          possui_identidade_visual?: string | null
          preferencia_tipografia?: string | null
          produto_resultado?: string | null
          produtos_servicos?: string | null
          publico_alvo?: string | null
          responsavel_projeto?: string | null
          restricao_comunicacao?: string | null
          submitted_by_user_id?: string | null
          tabela_servicos?: string | null
          ticket_medio?: string | null
          updated_at?: string
          valor_meta_ads?: string | null
          valores_diretos_artes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_start_form_responses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "operational_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_goals: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          goal_value: number
          id: string
          month: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          goal_value?: number
          id?: string
          month: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          goal_value?: number
          id?: string
          month?: string
          updated_at?: string
        }
        Relationships: []
      }
      commercial_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commercial_settings_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_config: {
        Row: {
          category: string
          config_key: string
          config_value: number
          description: string | null
          id: string
          label: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          category: string
          config_key: string
          config_value?: number
          description?: string | null
          id?: string
          label: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          category?: string
          config_key?: string
          config_value?: number
          description?: string | null
          id?: string
          label?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_config_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      criativos: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "criativos_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_events: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          event_type: string
          id: string
          resolved_at: string | null
          sale_value: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          resolved_at?: string | null
          sale_value?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          resolved_at?: string | null
          sale_value?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "operational_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exec_boards: {
        Row: {
          created_at: string
          created_by_user_id: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          sector: string
          team_id: string | null
          team_scope: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          sector: string
          team_id?: string | null
          team_scope?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          sector?: string
          team_id?: string | null
          team_scope?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exec_boards_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      exec_cards: {
        Row: {
          assigned_to_user_id: string | null
          attachments: Json | null
          board_id: string
          checklist: Json | null
          client_id: string | null
          column_id: string
          completed_at: string | null
          cover_image: string | null
          created_at: string
          created_by_user_id: string
          description: string | null
          due_date: string | null
          id: string
          order: number
          pinned: boolean
          priority: string
          tags: Json | null
          title: string
          updated_at: string
          watchers: Json | null
        }
        Insert: {
          assigned_to_user_id?: string | null
          attachments?: Json | null
          board_id: string
          checklist?: Json | null
          client_id?: string | null
          column_id: string
          completed_at?: string | null
          cover_image?: string | null
          created_at?: string
          created_by_user_id: string
          description?: string | null
          due_date?: string | null
          id?: string
          order?: number
          pinned?: boolean
          priority?: string
          tags?: Json | null
          title: string
          updated_at?: string
          watchers?: Json | null
        }
        Update: {
          assigned_to_user_id?: string | null
          attachments?: Json | null
          board_id?: string
          checklist?: Json | null
          client_id?: string | null
          column_id?: string
          completed_at?: string | null
          cover_image?: string | null
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          due_date?: string | null
          id?: string
          order?: number
          pinned?: boolean
          priority?: string
          tags?: Json | null
          title?: string
          updated_at?: string
          watchers?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "exec_cards_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "exec_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exec_cards_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "operational_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exec_cards_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "exec_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      exec_columns: {
        Row: {
          board_id: string
          color_tag: string | null
          created_at: string
          id: string
          name: string
          order: number
          wip_limit: number | null
        }
        Insert: {
          board_id: string
          color_tag?: string | null
          created_at?: string
          id?: string
          name: string
          order?: number
          wip_limit?: number | null
        }
        Update: {
          board_id?: string
          color_tag?: string | null
          created_at?: string
          id?: string
          name?: string
          order?: number
          wip_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exec_columns_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "exec_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      exec_comments: {
        Row: {
          author_user_id: string
          body: string
          card_id: string
          created_at: string
          id: string
        }
        Insert: {
          author_user_id: string
          body: string
          card_id: string
          created_at?: string
          id?: string
        }
        Update: {
          author_user_id?: string
          body?: string
          card_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exec_comments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "exec_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      exec_views: {
        Row: {
          board_id: string
          created_at: string
          filters: Json
          group_by: string
          id: string
          name: string
          sort: Json | null
          user_id: string
        }
        Insert: {
          board_id: string
          created_at?: string
          filters?: Json
          group_by?: string
          id?: string
          name: string
          sort?: Json | null
          user_id: string
        }
        Update: {
          board_id?: string
          created_at?: string
          filters?: Json
          group_by?: string
          id?: string
          name?: string
          sort?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exec_views_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "exec_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          created_by_user_id: string | null
          description: string
          expense_date: string
          id: string
          notes: string | null
          recurrence: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          recurrence?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          recurrence?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_simulations: {
        Row: {
          base_period: string
          cost_per_team: number
          created_at: string
          created_by_user_id: string
          estimated_extra_cost: number | null
          estimated_margin: number | null
          estimated_revenue: number | null
          id: string
          name: string
          new_teams_count: number
          notes: string | null
          updated_at: string
        }
        Insert: {
          base_period: string
          cost_per_team?: number
          created_at?: string
          created_by_user_id: string
          estimated_extra_cost?: number | null
          estimated_margin?: number | null
          estimated_revenue?: number | null
          id?: string
          name: string
          new_teams_count?: number
          notes?: string | null
          updated_at?: string
        }
        Update: {
          base_period?: string
          cost_per_team?: number
          created_at?: string
          created_by_user_id?: string
          estimated_extra_cost?: number | null
          estimated_margin?: number | null
          estimated_revenue?: number | null
          id?: string
          name?: string
          new_teams_count?: number
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_simulations_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_docs: {
        Row: {
          category_id: string | null
          content: string
          created_at: string
          id: string
          scope: Database["public"]["Enums"]["knowledge_scope"]
          source_resource_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          content: string
          created_at?: string
          id?: string
          scope?: Database["public"]["Enums"]["knowledge_scope"]
          source_resource_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          content?: string
          created_at?: string
          id?: string
          scope?: Database["public"]["Enums"]["knowledge_scope"]
          source_resource_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_docs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "study_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_docs_source_resource_id_fkey"
            columns: ["source_resource_id"]
            isOneToOne: false
            referencedRelation: "study_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_action_items: {
        Row: {
          assignee_user_id: string | null
          created_at: string
          due_date: string | null
          id: string
          meeting_id: string
          status: string
          title: string
          updated_at: string
          workitem_id: string | null
        }
        Insert: {
          assignee_user_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          meeting_id: string
          status?: string
          title: string
          updated_at?: string
          workitem_id?: string | null
        }
        Update: {
          assignee_user_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          meeting_id?: string
          status?: string
          title?: string
          updated_at?: string
          workitem_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_action_items_assignee_user_id_fkey"
            columns: ["assignee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_action_items_workitem_id_fkey"
            columns: ["workitem_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          agenda: string | null
          created_at: string
          created_by_user_id: string
          datetime_end: string
          datetime_start: string
          id: string
          notes: string | null
          participants: Json | null
          recording_link: string | null
          scope: string
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agenda?: string | null
          created_at?: string
          created_by_user_id: string
          datetime_end: string
          datetime_start: string
          id?: string
          notes?: string | null
          participants?: Json | null
          recording_link?: string | null
          scope?: string
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agenda?: string | null
          created_at?: string
          created_by_user_id?: string
          datetime_end?: string
          datetime_start?: string
          id?: string
          notes?: string | null
          participants?: Json | null
          recording_link?: string | null
          scope?: string
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      my_day_items: {
        Row: {
          completed_at: string | null
          created_at: string
          date: string
          deadline_date: string | null
          deadline_notified: boolean | null
          deadline_time: string | null
          id: string
          priority: string
          source: string
          source_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          date?: string
          deadline_date?: string | null
          deadline_notified?: boolean | null
          deadline_time?: string | null
          id?: string
          priority?: string
          source?: string
          source_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          date?: string
          deadline_date?: string | null
          deadline_notified?: boolean | null
          deadline_time?: string | null
          id?: string
          priority?: string
          source?: string
          source_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "my_day_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          read: boolean
          related_entity: string | null
          related_entity_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          related_entity?: string | null
          related_entity_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          related_entity?: string | null
          related_entity_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      operational_clients: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          ad_account_name: string | null
          assigned_atendente_id: string | null
          assigned_design_id: string | null
          assigned_editor_video_id: string | null
          assigned_gestor_id: string | null
          briefing_completed_at: string | null
          churn_date: string | null
          churn_reason: string | null
          churn_responsible_team_id: string | null
          churn_status: string | null
          client_name: string
          client_tier: string | null
          clinic_name: string | null
          commercial_id: string | null
          created_at: string
          creative_source: string | null
          deal_value: number | null
          has_recharge: boolean | null
          id: string
          nps_answered: boolean | null
          nps_sent: boolean | null
          onboarding_done_at: string | null
          onboarding_stage: string
          onboarding_start_at: string | null
          pacote: string | null
          pagador_anuncio: string | null
          plan: string | null
          recharge_value: number | null
          renewal_date: string | null
          renewal_due_date: string | null
          renewal_responsible_team_id: string | null
          renewal_status: string | null
          stage_atendimento: string | null
          stage_marketing: string | null
          stage_trafego: string | null
          start_meeting_date: string | null
          status_operacional: string
          status_updated_at: string | null
          team_id: string | null
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          ad_account_name?: string | null
          assigned_atendente_id?: string | null
          assigned_design_id?: string | null
          assigned_editor_video_id?: string | null
          assigned_gestor_id?: string | null
          briefing_completed_at?: string | null
          churn_date?: string | null
          churn_reason?: string | null
          churn_responsible_team_id?: string | null
          churn_status?: string | null
          client_name: string
          client_tier?: string | null
          clinic_name?: string | null
          commercial_id?: string | null
          created_at?: string
          creative_source?: string | null
          deal_value?: number | null
          has_recharge?: boolean | null
          id?: string
          nps_answered?: boolean | null
          nps_sent?: boolean | null
          onboarding_done_at?: string | null
          onboarding_stage?: string
          onboarding_start_at?: string | null
          pacote?: string | null
          pagador_anuncio?: string | null
          plan?: string | null
          recharge_value?: number | null
          renewal_date?: string | null
          renewal_due_date?: string | null
          renewal_responsible_team_id?: string | null
          renewal_status?: string | null
          stage_atendimento?: string | null
          stage_marketing?: string | null
          stage_trafego?: string | null
          start_meeting_date?: string | null
          status_operacional?: string
          status_updated_at?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          ad_account_name?: string | null
          assigned_atendente_id?: string | null
          assigned_design_id?: string | null
          assigned_editor_video_id?: string | null
          assigned_gestor_id?: string | null
          briefing_completed_at?: string | null
          churn_date?: string | null
          churn_reason?: string | null
          churn_responsible_team_id?: string | null
          churn_status?: string | null
          client_name?: string
          client_tier?: string | null
          clinic_name?: string | null
          commercial_id?: string | null
          created_at?: string
          creative_source?: string | null
          deal_value?: number | null
          has_recharge?: boolean | null
          id?: string
          nps_answered?: boolean | null
          nps_sent?: boolean | null
          onboarding_done_at?: string | null
          onboarding_stage?: string
          onboarding_start_at?: string | null
          pacote?: string | null
          pagador_anuncio?: string | null
          plan?: string | null
          recharge_value?: number | null
          renewal_date?: string | null
          renewal_due_date?: string | null
          renewal_responsible_team_id?: string | null
          renewal_status?: string | null
          stage_atendimento?: string | null
          stage_marketing?: string | null
          stage_trafego?: string | null
          start_meeting_date?: string | null
          status_operacional?: string
          status_updated_at?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_clients_assigned_atendente_id_fkey"
            columns: ["assigned_atendente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_clients_assigned_design_id_fkey"
            columns: ["assigned_design_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_clients_assigned_editor_video_id_fkey"
            columns: ["assigned_editor_video_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_clients_assigned_gestor_id_fkey"
            columns: ["assigned_gestor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_clients_churn_responsible_team_id_fkey"
            columns: ["churn_responsible_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_clients_renewal_responsible_team_id_fkey"
            columns: ["renewal_responsible_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_clients_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminders: {
        Row: {
          client_id: string
          client_name: string
          clinic_name: string | null
          created_at: string
          deal_value: number
          dismissed: boolean
          dismissed_by_user_id: string | null
          id: string
          payment_deadline: string
          updated_at: string
        }
        Insert: {
          client_id: string
          client_name: string
          clinic_name?: string | null
          created_at?: string
          deal_value?: number
          dismissed?: boolean
          dismissed_by_user_id?: string | null
          id?: string
          payment_deadline: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          client_name?: string
          clinic_name?: string | null
          created_at?: string
          deal_value?: number
          dismissed?: boolean
          dismissed_by_user_id?: string | null
          id?: string
          payment_deadline?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "pipeline_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_dismissed_by_user_id_fkey"
            columns: ["dismissed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_clients: {
        Row: {
          agendado_por: string | null
          agendado_via: string | null
          ativo: boolean | null
          client_name: string
          clinic_name: string | null
          created_at: string
          created_by_user_id: string | null
          criativo: string | null
          funil: string | null
          data_entrada: string | null
          entrada: number | null
          equipe: string | null
          faturamento: string | null
          faturamento_personalizado: string | null
          followup_done: boolean | null
          id: string
          indicacao: string | null
          is_mrr: boolean | null
          last_stage_change: string | null
          lost_reason: string | null
          meeting_date: string | null
          meeting_time: string | null
          mrr_entrada: number | null
          mrr_remaining: number | null
          no_show_reason: string | null
          notes: string | null
          pacote: string | null
          pagador_anuncio: string | null
          periodo: string | null
          pode_investir: string | null
          salao_ou_clinica: string | null
          stage: string | null
          telefone: string | null
          tem_mkt: string | null
          tem_secretaria: string | null
          tem_socio: string | null
          updated_at: string
          vendedor: string | null
        }
        Insert: {
          agendado_por?: string | null
          agendado_via?: string | null
          ativo?: boolean | null
          client_name: string
          clinic_name?: string | null
          created_at?: string
          created_by_user_id?: string | null
          criativo?: string | null
          funil?: string | null
          data_entrada?: string | null
          entrada?: number | null
          equipe?: string | null
          faturamento?: string | null
          faturamento_personalizado?: string | null
          followup_done?: boolean | null
          id?: string
          indicacao?: string | null
          is_mrr?: boolean | null
          last_stage_change?: string | null
          lost_reason?: string | null
          meeting_date?: string | null
          meeting_time?: string | null
          mrr_entrada?: number | null
          mrr_remaining?: number | null
          no_show_reason?: string | null
          notes?: string | null
          pacote?: string | null
          pagador_anuncio?: string | null
          periodo?: string | null
          pode_investir?: string | null
          salao_ou_clinica?: string | null
          stage?: string | null
          telefone?: string | null
          tem_mkt?: string | null
          tem_secretaria?: string | null
          tem_socio?: string | null
          updated_at?: string
          vendedor?: string | null
        }
        Update: {
          agendado_por?: string | null
          agendado_via?: string | null
          ativo?: boolean | null
          client_name?: string
          clinic_name?: string | null
          created_at?: string
          created_by_user_id?: string | null
          criativo?: string | null
          funil?: string | null
          data_entrada?: string | null
          entrada?: number | null
          equipe?: string | null
          faturamento?: string | null
          faturamento_personalizado?: string | null
          followup_done?: boolean | null
          id?: string
          indicacao?: string | null
          is_mrr?: boolean | null
          last_stage_change?: string | null
          lost_reason?: string | null
          meeting_date?: string | null
          meeting_time?: string | null
          mrr_entrada?: number | null
          mrr_remaining?: number | null
          no_show_reason?: string | null
          notes?: string | null
          pacote?: string | null
          pagador_anuncio?: string | null
          periodo?: string | null
          pode_investir?: string | null
          salao_ou_clinica?: string | null
          stage?: string | null
          telefone?: string | null
          tem_mkt?: string | null
          tem_secretaria?: string | null
          tem_socio?: string | null
          updated_at?: string
          vendedor?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          commercial_role: Database["public"]["Enums"]["commercial_role"] | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          operational_role:
            | Database["public"]["Enums"]["operational_role"]
            | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          commercial_role?:
            | Database["public"]["Enums"]["commercial_role"]
            | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean | null
          operational_role?:
            | Database["public"]["Enums"]["operational_role"]
            | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          commercial_role?:
            | Database["public"]["Enums"]["commercial_role"]
            | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          operational_role?:
            | Database["public"]["Enums"]["operational_role"]
            | null
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      project_deliverables: {
        Row: {
          assigned_to_user_id: string | null
          attachments: Json | null
          client_approval_required: boolean | null
          created_at: string | null
          id: string
          linked_exec_card_id: string | null
          name: string
          phase_id: string | null
          project_id: string
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to_user_id?: string | null
          attachments?: Json | null
          client_approval_required?: boolean | null
          created_at?: string | null
          id?: string
          linked_exec_card_id?: string | null
          name: string
          phase_id?: string | null
          project_id: string
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to_user_id?: string | null
          attachments?: Json | null
          client_approval_required?: boolean | null
          created_at?: string | null
          id?: string
          linked_exec_card_id?: string | null
          name?: string
          phase_id?: string | null
          project_id?: string
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_deliverables_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_deliverables_linked_exec_card_id_fkey"
            columns: ["linked_exec_card_id"]
            isOneToOne: false
            referencedRelation: "exec_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_deliverables_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "project_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_deliverables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_goals: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          estimated_hours: number | null
          id: string
          project_id: string
          scrum_status: string
          sort_order: number | null
          sprint_week: number | null
          title: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          project_id: string
          scrum_status?: string
          sort_order?: number | null
          sprint_week?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          project_id?: string
          scrum_status?: string
          sort_order?: number | null
          sprint_week?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_goals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          created_at: string | null
          id: string
          name: string
          notes: string | null
          phase_id: string | null
          project_id: string
          status: string | null
          target_date: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          phase_id?: string | null
          project_id: string
          status?: string | null
          target_date?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          phase_id?: string | null
          project_id?: string
          status?: string | null
          target_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "project_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_phases: {
        Row: {
          created_at: string | null
          due_date: string | null
          id: string
          name: string
          order: number | null
          progress_pct: number | null
          project_id: string
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          due_date?: string | null
          id?: string
          name: string
          order?: number | null
          progress_pct?: number | null
          project_id: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          due_date?: string | null
          id?: string
          name?: string
          order?: number | null
          progress_pct?: number | null
          project_id?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_risks: {
        Row: {
          created_at: string | null
          id: string
          mitigation_plan: string | null
          owner_user_id: string | null
          probability: string | null
          project_id: string
          severity: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          mitigation_plan?: string | null
          owner_user_id?: string | null
          probability?: string | null
          project_id: string
          severity?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          mitigation_plan?: string | null
          owner_user_id?: string | null
          probability?: string | null
          project_id?: string
          severity?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_risks_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_risks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_updates: {
        Row: {
          author_user_id: string
          body: string
          created_at: string | null
          id: string
          project_id: string
          type: string | null
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string | null
          id?: string
          project_id: string
          type?: string | null
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string | null
          id?: string
          project_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_updates_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          blockers_count: number | null
          budget_planned: number | null
          budget_used: number | null
          client_id: string | null
          code: string | null
          created_at: string | null
          created_by_user_id: string | null
          description: string | null
          due_date: string | null
          id: string
          name: string
          owner_user_id: string | null
          owner_user_ids: string[] | null
          priority: string | null
          progress_pct: number | null
          risks_count: number | null
          roi_expected: number | null
          start_date: string | null
          status: string | null
          team: string | null
          updated_at: string | null
        }
        Insert: {
          blockers_count?: number | null
          budget_planned?: number | null
          budget_used?: number | null
          client_id?: string | null
          code?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          owner_user_id?: string | null
          owner_user_ids?: string[] | null
          priority?: string | null
          progress_pct?: number | null
          risks_count?: number | null
          roi_expected?: number | null
          start_date?: string | null
          status?: string | null
          team?: string | null
          updated_at?: string | null
        }
        Update: {
          blockers_count?: number | null
          budget_planned?: number | null
          budget_used?: number | null
          client_id?: string | null
          code?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          owner_user_id?: string | null
          owner_user_ids?: string[] | null
          priority?: string | null
          progress_pct?: number | null
          risks_count?: number | null
          roi_expected?: number | null
          start_date?: string | null
          status?: string | null
          team?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "operational_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_cost_defaults: {
        Row: {
          default_benefits: number
          default_other: number
          default_salary: number
          id: string
          role_type: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          default_benefits?: number
          default_other?: number
          default_salary?: number
          id?: string
          role_type: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          default_benefits?: number
          default_other?: number
          default_salary?: number
          id?: string
          role_type?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_cost_defaults_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sdr_goals: {
        Row: {
          agendador: string
          created_at: string
          created_by_user_id: string | null
          goal_count: number
          id: string
          month: string
          updated_at: string
        }
        Insert: {
          agendador: string
          created_at?: string
          created_by_user_id?: string | null
          goal_count?: number
          id?: string
          month: string
          updated_at?: string
        }
        Update: {
          agendador?: string
          created_at?: string
          created_by_user_id?: string | null
          goal_count?: number
          id?: string
          month?: string
          updated_at?: string
        }
        Relationships: []
      }
      strategic_decisions: {
        Row: {
          affected_project_ids: string[] | null
          affected_task_ids: string[] | null
          created_at: string | null
          created_by_user_id: string | null
          decision: string
          expected_impact: string | null
          id: string
          reason: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          affected_project_ids?: string[] | null
          affected_task_ids?: string[] | null
          created_at?: string | null
          created_by_user_id?: string | null
          decision: string
          expected_impact?: string | null
          id?: string
          reason?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          affected_project_ids?: string[] | null
          affected_task_ids?: string[] | null
          created_at?: string | null
          created_by_user_id?: string | null
          decision?: string
          expected_impact?: string | null
          id?: string
          reason?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      strategic_tasks: {
        Row: {
          assigned_to_user_id: string | null
          code: string | null
          completed_at: string | null
          created_at: string | null
          created_by_user_id: string | null
          delay_cost_deadline_impact: string | null
          delay_cost_financial: number | null
          delay_cost_project_impact: string | null
          description: string | null
          due_date: string | null
          effort_estimate: number | null
          id: string
          impact_operational: number | null
          impact_revenue: number | null
          impact_score: number | null
          last_status_change: string | null
          order_index: number | null
          project_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["strategic_task_status"]
          status_changes_count: number | null
          strategic_goal: Database["public"]["Enums"]["strategic_goal"]
          tags: Json | null
          title: string
          updated_at: string | null
          urgency: number | null
        }
        Insert: {
          assigned_to_user_id?: string | null
          code?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          delay_cost_deadline_impact?: string | null
          delay_cost_financial?: number | null
          delay_cost_project_impact?: string | null
          description?: string | null
          due_date?: string | null
          effort_estimate?: number | null
          id?: string
          impact_operational?: number | null
          impact_revenue?: number | null
          impact_score?: number | null
          last_status_change?: string | null
          order_index?: number | null
          project_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["strategic_task_status"]
          status_changes_count?: number | null
          strategic_goal?: Database["public"]["Enums"]["strategic_goal"]
          tags?: Json | null
          title: string
          updated_at?: string | null
          urgency?: number | null
        }
        Update: {
          assigned_to_user_id?: string | null
          code?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          delay_cost_deadline_impact?: string | null
          delay_cost_financial?: number | null
          delay_cost_project_impact?: string | null
          description?: string | null
          due_date?: string | null
          effort_estimate?: number | null
          id?: string
          impact_operational?: number | null
          impact_revenue?: number | null
          impact_score?: number | null
          last_status_change?: string | null
          order_index?: number | null
          project_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["strategic_task_status"]
          status_changes_count?: number | null
          strategic_goal?: Database["public"]["Enums"]["strategic_goal"]
          tags?: Json | null
          title?: string
          updated_at?: string | null
          urgency?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "strategic_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_ai_conversations: {
        Row: {
          category_id: string | null
          context_mode: Database["public"]["Enums"]["ai_context_mode"]
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          context_mode?: Database["public"]["Enums"]["ai_context_mode"]
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          context_mode?: Database["public"]["Enums"]["ai_context_mode"]
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_ai_conversations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "study_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["ai_message_role"]
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["ai_message_role"]
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["ai_message_role"]
        }
        Relationships: [
          {
            foreignKeyName: "study_ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "study_ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      study_categories: {
        Row: {
          color: string | null
          created_at: string
          created_by_user_id: string
          description: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by_user_id: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_categories_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_collections: {
        Row: {
          category_id: string
          created_at: string
          created_by_user_id: string
          description: string | null
          id: string
          name: string
          resource_ids: Json | null
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by_user_id: string
          description?: string | null
          id?: string
          name: string
          resource_ids?: Json | null
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          id?: string
          name?: string
          resource_ids?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "study_collections_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "study_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_collections_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_quiz_attempts: {
        Row: {
          answers: Json
          created_at: string
          id: string
          quiz_id: string
          score: number
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          quiz_id: string
          score?: number
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          quiz_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "study_quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_quizzes: {
        Row: {
          category_id: string
          created_at: string
          created_by_user_id: string
          id: string
          questions: Json
          resource_id: string | null
          title: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by_user_id: string
          id?: string
          questions?: Json
          resource_id?: string | null
          title: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by_user_id?: string
          id?: string
          questions?: Json
          resource_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_quizzes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "study_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_quizzes_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_quizzes_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "study_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      study_resources: {
        Row: {
          category_id: string
          created_at: string
          created_by_user_id: string
          description: string | null
          difficulty: Database["public"]["Enums"]["study_difficulty"]
          duration_min: number | null
          file_ref: string | null
          id: string
          source_url: string | null
          tags: Json | null
          title: string
          type: Database["public"]["Enums"]["study_resource_type"]
          updated_at: string
          visibility: Database["public"]["Enums"]["study_visibility"]
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by_user_id: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["study_difficulty"]
          duration_min?: number | null
          file_ref?: string | null
          id?: string
          source_url?: string | null
          tags?: Json | null
          title: string
          type: Database["public"]["Enums"]["study_resource_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["study_visibility"]
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["study_difficulty"]
          duration_min?: number | null
          file_ref?: string | null
          id?: string
          source_url?: string | null
          tags?: Json | null
          title?: string
          type?: Database["public"]["Enums"]["study_resource_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["study_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "study_resources_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "study_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_resources_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_cost_config: {
        Row: {
          currency: string
          default_team_cost: number
          id: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          currency?: string
          default_team_cost?: number
          id?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          currency?: string
          default_team_cost?: number
          id?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_cost_config_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_cost_overrides: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          id: string
          monthly_cost: number
          team_id: string | null
          team_name: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          monthly_cost: number
          team_id?: string | null
          team_name: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          monthly_cost?: number
          team_id?: string | null
          team_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_cost_overrides_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_cost_overrides_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_member_costs: {
        Row: {
          benefits_cost: number
          created_at: string
          created_by_user_id: string | null
          id: string
          is_active: boolean
          member_name: string | null
          monthly_salary: number
          notes: string | null
          other_costs: number
          profile_id: string | null
          role_type: string
          team_id: string | null
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          benefits_cost?: number
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          is_active?: boolean
          member_name?: string | null
          monthly_salary?: number
          notes?: string | null
          other_costs?: number
          profile_id?: string | null
          role_type: string
          team_id?: string | null
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          benefits_cost?: number
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          is_active?: boolean
          member_name?: string | null
          monthly_salary?: number
          notes?: string | null
          other_costs?: number
          profile_id?: string | null
          role_type?: string
          team_id?: string | null
          total_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_member_costs_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_member_costs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_member_costs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tech_deployments: {
        Row: {
          assignee: string | null
          client_name: string | null
          created_at: string
          created_by_user_id: string | null
          description: string | null
          due_date: string | null
          id: string
          position: number | null
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          client_name?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          client_name?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      tech_tasks: {
        Row: {
          assignee: string | null
          created_at: string
          created_by_user_id: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string
          progress: number | null
          status: string
          tags: Json | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          progress?: number | null
          status?: string
          tags?: Json | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          progress?: number | null
          status?: string
          tags?: Json | null
          title?: string
          type?: string
          updated_at?: string
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
      user_study_progress: {
        Row: {
          completed_at: string | null
          id: string
          last_access_at: string | null
          notes: string | null
          progress_pct: number
          rating: number | null
          resource_id: string
          status: Database["public"]["Enums"]["study_progress_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          last_access_at?: string | null
          notes?: string | null
          progress_pct?: number
          rating?: number | null
          resource_id: string
          status?: Database["public"]["Enums"]["study_progress_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          last_access_at?: string | null
          notes?: string | null
          progress_pct?: number
          rating?: number | null
          resource_id?: string
          status?: Database["public"]["Enums"]["study_progress_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_study_progress_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "study_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_study_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_reminder_logs: {
        Row: {
          client_name: string
          client_phone: string
          created_by_user_id: string | null
          error_message: string | null
          event_id: string | null
          id: string
          message: string
          reminder_type: string
          sent_at: string
          status: string
        }
        Insert: {
          client_name: string
          client_phone: string
          created_by_user_id?: string | null
          error_message?: string | null
          event_id?: string | null
          id?: string
          message: string
          reminder_type: string
          sent_at?: string
          status?: string
        }
        Update: {
          client_name?: string
          client_phone?: string
          created_by_user_id?: string | null
          error_message?: string | null
          event_id?: string | null
          id?: string
          message?: string
          reminder_type?: string
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_reminder_logs_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_reminder_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "agenda_events"
            referencedColumns: ["id"]
          },
        ]
      }
      work_items: {
        Row: {
          assignee_user_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          estimate_points: number | null
          id: string
          priority: string
          related_client_id: string | null
          reporter_user_id: string
          status: string
          tags: Json | null
          team_id: string | null
          title: string
          type: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assignee_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimate_points?: number | null
          id?: string
          priority?: string
          related_client_id?: string | null
          reporter_user_id: string
          status?: string
          tags?: Json | null
          team_id?: string | null
          title: string
          type?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assignee_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimate_points?: number | null
          id?: string
          priority?: string
          related_client_id?: string | null
          reporter_user_id?: string
          status?: string
          tags?: Json | null
          team_id?: string | null
          title?: string
          type?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_items_assignee_user_id_fkey"
            columns: ["assignee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_related_client_id_fkey"
            columns: ["related_client_id"]
            isOneToOne: false
            referencedRelation: "operational_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_workspace_id_fkey"
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
          created_by_user_id: string
          id: string
          name: string
          parent_id: string | null
          team_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          id?: string
          name: string
          parent_id?: string | null
          team_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          id?: string
          name?: string
          parent_id?: string | null
          team_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspaces_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspaces_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_coordinator: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      ai_context_mode: "CATEGORY_FOCUS" | "GREAT_GENERAL"
      ai_message_role: "USER" | "ASSISTANT" | "SYSTEM"
      app_role: "admin" | "user"
      commercial_role: "SDR" | "CLOSER" | "COORDENADOR_COMERCIAL"
      knowledge_scope: "GREAT_GLOBAL" | "CATEGORY"
      operational_role:
        | "COORDENADOR_RED"
        | "GESTOR"
        | "ATENDENTE"
        | "DESIGN"
        | "EDITOR_VIDEO"
        | "EQUIPE_DESIGN"
        | "EQUIPE_TECH"
      strategic_goal:
        | "CRESCIMENTO"
        | "RECEITA"
        | "PRODUTO"
        | "OPERACAO"
        | "SUPORTE"
        | "NENHUM"
      strategic_task_status:
        | "BACKLOG"
        | "TODO"
        | "EM_ANDAMENTO"
        | "EM_REVISAO"
        | "CONCLUIDO"
        | "BLOQUEADO"
        | "CANCELADO"
      study_difficulty: "INICIANTE" | "INTERMEDIARIO" | "AVANCADO"
      study_progress_status: "NAO_INICIADO" | "EM_ANDAMENTO" | "CONCLUIDO"
      study_resource_type:
        | "DOCUMENT"
        | "PDF"
        | "EBOOK"
        | "VIDEO"
        | "LINK"
        | "TRAINING"
        | "PLAYBOOK"
      study_visibility: "OPERACIONAL_ONLY" | "COMMERCIAL_ONLY" | "ALL_INTERNAL"
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
      ai_context_mode: ["CATEGORY_FOCUS", "GREAT_GENERAL"],
      ai_message_role: ["USER", "ASSISTANT", "SYSTEM"],
      app_role: ["admin", "user"],
      commercial_role: ["SDR", "CLOSER", "COORDENADOR_COMERCIAL"],
      knowledge_scope: ["GREAT_GLOBAL", "CATEGORY"],
      operational_role: [
        "COORDENADOR_RED",
        "GESTOR",
        "ATENDENTE",
        "DESIGN",
        "EDITOR_VIDEO",
        "EQUIPE_DESIGN",
        "EQUIPE_TECH",
      ],
      strategic_goal: [
        "CRESCIMENTO",
        "RECEITA",
        "PRODUTO",
        "OPERACAO",
        "SUPORTE",
        "NENHUM",
      ],
      strategic_task_status: [
        "BACKLOG",
        "TODO",
        "EM_ANDAMENTO",
        "EM_REVISAO",
        "CONCLUIDO",
        "BLOQUEADO",
        "CANCELADO",
      ],
      study_difficulty: ["INICIANTE", "INTERMEDIARIO", "AVANCADO"],
      study_progress_status: ["NAO_INICIADO", "EM_ANDAMENTO", "CONCLUIDO"],
      study_resource_type: [
        "DOCUMENT",
        "PDF",
        "EBOOK",
        "VIDEO",
        "LINK",
        "TRAINING",
        "PLAYBOOK",
      ],
      study_visibility: ["OPERACIONAL_ONLY", "COMMERCIAL_ONLY", "ALL_INTERNAL"],
    },
  },
} as const
