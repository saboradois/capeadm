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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      pedidos: {
        Row: {
          codigo_pedido: string
          created_at: string
          email_cliente: string | null
          id: string
          meio_cobranca: string | null
          nome_cliente: string
          nome_peca: string
          numero_parcelas: number | null
          produto_id: string | null
          quantidade: number
          status_pedido: string
          tipo_pagamento: string | null
          updated_at: string
          valor_total: number
          valor_unitario: number
          whatsapp_cliente: string
        }
        Insert: {
          codigo_pedido: string
          created_at?: string
          email_cliente?: string | null
          id?: string
          meio_cobranca?: string | null
          nome_cliente: string
          nome_peca: string
          numero_parcelas?: number | null
          produto_id?: string | null
          quantidade?: number
          status_pedido?: string
          tipo_pagamento?: string | null
          updated_at?: string
          valor_total?: number
          valor_unitario?: number
          whatsapp_cliente: string
        }
        Update: {
          codigo_pedido?: string
          created_at?: string
          email_cliente?: string | null
          id?: string
          meio_cobranca?: string | null
          nome_cliente?: string
          nome_peca?: string
          numero_parcelas?: number | null
          produto_id?: string | null
          quantidade?: number
          status_pedido?: string
          tipo_pagamento?: string | null
          updated_at?: string
          valor_total?: number
          valor_unitario?: number
          whatsapp_cliente?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_semijoias"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_semijoias: {
        Row: {
          created_at: string
          custo_peca: number
          custo_tag_unitario: number
          custo_total_peca: number
          custo_verniz_por_peca: number
          id: string
          lucro_estimado: number
          margem_real: number
          meio_cobranca: string
          multiplicador_lucro: number
          nome_peca: string
          numero_parcelas: number | null
          preco_base: number
          preco_final: number
          taxa_cartao: number
          tipo_pagamento: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custo_peca?: number
          custo_tag_unitario?: number
          custo_total_peca?: number
          custo_verniz_por_peca?: number
          id?: string
          lucro_estimado?: number
          margem_real?: number
          meio_cobranca?: string
          multiplicador_lucro?: number
          nome_peca: string
          numero_parcelas?: number | null
          preco_base?: number
          preco_final?: number
          taxa_cartao?: number
          tipo_pagamento?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custo_peca?: number
          custo_tag_unitario?: number
          custo_total_peca?: number
          custo_verniz_por_peca?: number
          id?: string
          lucro_estimado?: number
          margem_real?: number
          meio_cobranca?: string
          multiplicador_lucro?: number
          nome_peca?: string
          numero_parcelas?: number | null
          preco_base?: number
          preco_final?: number
          taxa_cartao?: number
          tipo_pagamento?: string
          updated_at?: string
        }
        Relationships: []
      }
      transacoes_pix: {
        Row: {
          created_at: string
          id: string
          id_mercadopago: string | null
          pedido_id: string
          pix_text: string | null
          qr_code_base64: string | null
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          id?: string
          id_mercadopago?: string | null
          pedido_id: string
          pix_text?: string | null
          qr_code_base64?: string | null
          status?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          created_at?: string
          id?: string
          id_mercadopago?: string | null
          pedido_id?: string
          pix_text?: string | null
          qr_code_base64?: string | null
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_pix_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
