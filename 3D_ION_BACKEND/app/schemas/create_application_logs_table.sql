-- Create application_logs table for comprehensive audit trail and APM
-- This table replaces the legacy 'historico' table with a unified, structured logging system

CREATE TABLE IF NOT EXISTS public.application_logs (
  id BIGSERIAL PRIMARY KEY,

  -- User identification
  user_id uuid REFERENCES public.researchers(id) ON DELETE SET NULL,
  user_name text,
  user_email text,
  user_type text, -- 'pesquisador' | 'admin'

  -- Action classification
  action_category text NOT NULL CHECK (
    action_category = ANY (
      ARRAY[
        'AUTH',
        'USER_MANAGEMENT',
        'EXPERIMENT_MANAGEMENT',
        'STATUS_CHANGE',
        'DATA_ENTRY',
        'DATA_UPDATE',
        'DATA_DELETE',
        'VIEW',
        'ADMIN_ACTION',
        'SYSTEM_EVENT',
        'ERROR',
        'NOTIFICATION'
      ]
    )
  ),

  -- Specific action type
  action_type text NOT NULL,

  -- Affected entity
  entity_name text, -- 'samples', 'researchers', 'mechanical_properties', etc
  entity_id uuid,

  -- Status tracking (for sample status changes)
  old_status text,
  new_status text,

  -- Scientific snapshot (when relevant)
  old_data jsonb,
  new_data jsonb,

  -- Technical monitoring (simplified APM)
  endpoint text,
  http_method text,
  http_status integer,
  duration_ms integer,
  severity_level text NOT NULL DEFAULT 'INFO' CHECK (
    severity_level = ANY (ARRAY['INFO','WARNING','CRITICAL'])
  ),

  -- Session context
  session_id text,
  ip_address inet,
  user_agent text,

  -- Semantic description
  description text,

  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create recommended indexes for query performance
CREATE INDEX IF NOT EXISTS idx_logs_user ON public.application_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_entity ON public.application_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON public.application_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_severity ON public.application_logs(severity_level);
CREATE INDEX IF NOT EXISTS idx_logs_action_category ON public.application_logs(action_category);
CREATE INDEX IF NOT EXISTS idx_logs_entity_name ON public.application_logs(entity_name);

-- Enable RLS (Row Level Security) - only admins can view all logs
ALTER TABLE public.application_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all logs
CREATE POLICY "admin_view_all_logs" ON public.application_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.researchers
      WHERE id = auth.uid()
      AND user_type = 'admin'
    )
  );

-- Policy: Users can only view their own logs
CREATE POLICY "user_view_own_logs" ON public.application_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Only backend can insert logs (no direct user inserts)
CREATE POLICY "backend_insert_logs" ON public.application_logs
  FOR INSERT
  WITH CHECK (true);

-- Policy: Logs are immutable (no updates or deletes)
CREATE POLICY "logs_immutable" ON public.application_logs
  FOR UPDATE
  USING (false);

CREATE POLICY "logs_no_delete" ON public.application_logs
  FOR DELETE
  USING (false);
