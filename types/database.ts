export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
        };
      };
      agents: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          name: string;
          persona_json: Json;
          settings_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          name: string;
          persona_json: Json;
          settings_json?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          name?: string;
          persona_json?: Json;
          settings_json?: Json;
          created_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          agent_id: string;
          role: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          role: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          role?: string;
          content?: string;
          created_at?: string;
        };
      };
      agent_memory: {
        Row: {
          id: string;
          agent_id: string;
          key: string;
          value: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          key: string;
          value: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string;
          key?: string;
          value?: string;
          updated_at?: string;
        };
      };
    };
  };
}
