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
    PostgrestVersion: "13.0.5"
  }
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
      alertas: {
        Row: {
          fecha_creacion: string | null
          id_alerta: string
          id_dispositivo_fk: string
          id_usuario_fk: string
          leido: boolean | null
          mensaje: string
          metadata: Json | null
          tipo_alerta: string
        }
        Insert: {
          fecha_creacion?: string | null
          id_alerta?: string
          id_dispositivo_fk: string
          id_usuario_fk: string
          leido?: boolean | null
          mensaje: string
          metadata?: Json | null
          tipo_alerta: string
        }
        Update: {
          fecha_creacion?: string | null
          id_alerta?: string
          id_dispositivo_fk?: string
          id_usuario_fk?: string
          leido?: boolean | null
          mensaje?: string
          metadata?: Json | null
          tipo_alerta?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_id_dispositivo_fk_fkey"
            columns: ["id_dispositivo_fk"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id_dispositivo"]
          },
        ]
      }
      community_baselines: {
        Row: {
          avg_peak_kwh: number | null
          avg_standby_kwh: number | null
          device_brand: string
          device_model: string
          device_type: Database["public"]["Enums"]["device_type_enum"]
          id: number
          last_updated: string | null
          sample_size: number
        }
        Insert: {
          avg_peak_kwh?: number | null
          avg_standby_kwh?: number | null
          device_brand: string
          device_model: string
          device_type: Database["public"]["Enums"]["device_type_enum"]
          id?: number
          last_updated?: string | null
          sample_size?: number
        }
        Update: {
          avg_peak_kwh?: number | null
          avg_standby_kwh?: number | null
          device_brand?: string
          device_model?: string
          device_type?: Database["public"]["Enums"]["device_type_enum"]
          id?: number
          last_updated?: string | null
          sample_size?: number
        }
        Relationships: []
      }
      config_usuarios: {
        Row: {
          costo_kwh: number | null
          id_usuario_fk: string
          limite_basico: number | null
          modo_tarifa: string | null
          moneda: string | null
          presupuesto_meta: number | null
          tarifa_basica: number | null
          tarifa_excedente: number | null
        }
        Insert: {
          costo_kwh?: number | null
          id_usuario_fk: string
          limite_basico?: number | null
          modo_tarifa?: string | null
          moneda?: string | null
          presupuesto_meta?: number | null
          tarifa_basica?: number | null
          tarifa_excedente?: number | null
        }
        Update: {
          costo_kwh?: number | null
          id_usuario_fk?: string
          limite_basico?: number | null
          modo_tarifa?: string | null
          moneda?: string | null
          presupuesto_meta?: number | null
          tarifa_basica?: number | null
          tarifa_excedente?: number | null
        }
        Relationships: []
      }
      dispositivos: {
        Row: {
          archivado: boolean | null
          baseline_data: Json | null
          community_joined_at: string | null
          community_status: string | null
          device_brand: string | null
          device_meta: Json | null
          device_model: string | null
          device_type: Database["public"]["Enums"]["device_type_enum"] | null
          estado_rele_actual: boolean | null
          fecha_registro: string | null
          id_dispositivo: string
          id_grupo_fk: string | null
          id_hardware: string
          id_usuario_fk: string
          monitoring_status:
            | Database["public"]["Enums"]["monitor_status_enum"]
            | null
          nombre_personalizado: string
          ultimo_heartbeat: string | null
        }
        Insert: {
          archivado?: boolean | null
          baseline_data?: Json | null
          community_joined_at?: string | null
          community_status?: string | null
          device_brand?: string | null
          device_meta?: Json | null
          device_model?: string | null
          device_type?: Database["public"]["Enums"]["device_type_enum"] | null
          estado_rele_actual?: boolean | null
          fecha_registro?: string | null
          id_dispositivo?: string
          id_grupo_fk?: string | null
          id_hardware: string
          id_usuario_fk: string
          monitoring_status?:
            | Database["public"]["Enums"]["monitor_status_enum"]
            | null
          nombre_personalizado: string
          ultimo_heartbeat?: string | null
        }
        Update: {
          archivado?: boolean | null
          baseline_data?: Json | null
          community_joined_at?: string | null
          community_status?: string | null
          device_brand?: string | null
          device_meta?: Json | null
          device_model?: string | null
          device_type?: Database["public"]["Enums"]["device_type_enum"] | null
          estado_rele_actual?: boolean | null
          fecha_registro?: string | null
          id_dispositivo?: string
          id_grupo_fk?: string | null
          id_hardware?: string
          id_usuario_fk?: string
          monitoring_status?:
            | Database["public"]["Enums"]["monitor_status_enum"]
            | null
          nombre_personalizado?: string
          ultimo_heartbeat?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispositivos_id_grupo_fk_fkey"
            columns: ["id_grupo_fk"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id_grupo"]
          },
        ]
      }
      dispositivos_pendientes: {
        Row: {
          id_hardware: string
          ip_address: unknown
          ultima_vez_visto: string | null
        }
        Insert: {
          id_hardware: string
          ip_address?: unknown
          ultima_vez_visto?: string | null
        }
        Update: {
          id_hardware?: string
          ip_address?: unknown
          ultima_vez_visto?: string | null
        }
        Relationships: []
      }
      grupos: {
        Row: {
          fecha_creacion: string | null
          id_grupo: string
          id_usuario_fk: string
          nombre_grupo: string
        }
        Insert: {
          fecha_creacion?: string | null
          id_grupo?: string
          id_usuario_fk: string
          nombre_grupo: string
        }
        Update: {
          fecha_creacion?: string | null
          id_grupo?: string
          id_usuario_fk?: string
          nombre_grupo?: string
        }
        Relationships: []
      }
      lecturas_consumo: {
        Row: {
          id_dispositivo_fk: string
          id_lectura: number
          kwh_consumidos: number
          timestamp_lectura: string
        }
        Insert: {
          id_dispositivo_fk: string
          id_lectura?: number
          kwh_consumidos: number
          timestamp_lectura: string
        }
        Update: {
          id_dispositivo_fk?: string
          id_lectura?: number
          kwh_consumidos?: number
          timestamp_lectura?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecturas_consumo_id_dispositivo_fk_fkey"
            columns: ["id_dispositivo_fk"]
            isOneToOne: false
            referencedRelation: "dispositivos"
            referencedColumns: ["id_dispositivo"]
          },
        ]
      }
      oauth_access_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expira_en: string
          id: string
          id_usuario_fk: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expira_en: string
          id?: string
          id_usuario_fk: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expira_en?: string
          id?: string
          id_usuario_fk?: string
        }
        Relationships: []
      }
      oauth_clients: {
        Row: {
          client_id: string
          client_secret: string
          id_cliente: string
          nombre_cliente: string
          redirect_uri: string
        }
        Insert: {
          client_id: string
          client_secret: string
          id_cliente?: string
          nombre_cliente: string
          redirect_uri: string
        }
        Update: {
          client_id?: string
          client_secret?: string
          id_cliente?: string
          nombre_cliente?: string
          redirect_uri?: string
        }
        Relationships: []
      }
      oauth_codes: {
        Row: {
          codigo: string
          expira_en: string
          id_cliente_fk: string
          id_codigo: string
          id_usuario_fk: string
          usado: boolean | null
        }
        Insert: {
          codigo: string
          expira_en?: string
          id_cliente_fk: string
          id_codigo?: string
          id_usuario_fk: string
          usado?: boolean | null
        }
        Update: {
          codigo?: string
          expira_en?: string
          id_cliente_fk?: string
          id_codigo?: string
          id_usuario_fk?: string
          usado?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_codes_id_cliente_fk_fkey"
            columns: ["id_cliente_fk"]
            isOneToOne: false
            referencedRelation: "oauth_clients"
            referencedColumns: ["id_cliente"]
          },
        ]
      }
      oauth_refresh_tokens: {
        Row: {
          fecha_creacion: string
          id_cliente_fk: string
          id_token: string
          id_usuario_fk: string
          refresh_token: string
        }
        Insert: {
          fecha_creacion?: string
          id_cliente_fk: string
          id_token?: string
          id_usuario_fk: string
          refresh_token: string
        }
        Update: {
          fecha_creacion?: string
          id_cliente_fk?: string
          id_token?: string
          id_usuario_fk?: string
          refresh_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_refresh_tokens_id_cliente_fk_fkey"
            columns: ["id_cliente_fk"]
            isOneToOne: false
            referencedRelation: "oauth_clients"
            referencedColumns: ["id_cliente"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_analytics_compare: {
        Args: {
          p_device_id: string
          p_end_a: string
          p_end_b: string
          p_start_a: string
          p_start_b: string
        }
        Returns: Json
      }
      get_analytics_device_data: {
        Args: { p_device_id: string; p_end_date: string; p_start_date: string }
        Returns: {
          kwh_consumed: number
          timestamp_bucket: string
        }[]
      }
      get_analytics_group_data: {
        Args: { p_end_date: string; p_group_id: string; p_start_date: string }
        Returns: {
          kwh_consumed: number
          timestamp_bucket: string
        }[]
      }
      get_analytics_summary_today: { Args: never; Returns: Json }
      get_cost_prediction: { Args: never; Returns: Json }
      get_duplicate_device_groups: {
        Args: never
        Returns: {
          device_type: Database["public"]["Enums"]["device_type_enum"]
          id_usuario_fk: string
        }[]
      }
      get_integrations_status: { Args: never; Returns: Json }
      perform_daily_aggregation: { Args: never; Returns: undefined }
      registrar_dispositivo: {
        Args: {
          p_client_ip: string
          p_id_grupo_fk: string
          p_id_hardware: string
          p_nombre_personalizado: string
        }
        Returns: {
          archivado: boolean | null
          baseline_data: Json | null
          community_joined_at: string | null
          community_status: string | null
          device_brand: string | null
          device_meta: Json | null
          device_model: string | null
          device_type: Database["public"]["Enums"]["device_type_enum"] | null
          estado_rele_actual: boolean | null
          fecha_registro: string | null
          id_dispositivo: string
          id_grupo_fk: string | null
          id_hardware: string
          id_usuario_fk: string
          monitoring_status:
            | Database["public"]["Enums"]["monitor_status_enum"]
            | null
          nombre_personalizado: string
          ultimo_heartbeat: string | null
        }
        SetofOptions: {
          from: "*"
          to: "dispositivos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      device_type_enum:
        | "refrigerador"
        | "congelador"
        | "aire_acondicionado"
        | "calefactor"
        | "bomba_agua"
        | "tv"
        | "consola"
        | "computadora"
        | "modem_router"
        | "iluminacion"
        | "lavadora"
        | "secadora"
        | "microondas"
        | "horno"
        | "cafetera"
        | "licuadora"
        | "enchufe_inteligente"
        | "cargador_ev"
        | "otro"
      monitor_status_enum: "learning" | "monitoring" | "error"
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
      device_type_enum: [
        "refrigerador",
        "congelador",
        "aire_acondicionado",
        "calefactor",
        "bomba_agua",
        "tv",
        "consola",
        "computadora",
        "modem_router",
        "iluminacion",
        "lavadora",
        "secadora",
        "microondas",
        "horno",
        "cafetera",
        "licuadora",
        "enchufe_inteligente",
        "cargador_ev",
        "otro",
      ],
      monitor_status_enum: ["learning", "monitoring", "error"],
    },
  },
} as const
