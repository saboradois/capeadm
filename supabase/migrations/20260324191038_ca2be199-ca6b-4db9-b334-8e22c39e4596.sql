
CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  whatsapp text NOT NULL,
  email text,
  user_id uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(whatsapp, user_id)
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own clientes" ON public.clientes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own clientes" ON public.clientes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own clientes" ON public.clientes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own clientes" ON public.clientes FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES public.clientes(id);
