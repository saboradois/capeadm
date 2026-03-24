ALTER TABLE public.produtos_semijoias ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
ALTER TABLE public.pedidos ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
ALTER TABLE public.transacoes_pix ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

DROP POLICY IF EXISTS "Public read produtos" ON public.produtos_semijoias;
DROP POLICY IF EXISTS "Public insert produtos" ON public.produtos_semijoias;
DROP POLICY IF EXISTS "Public update produtos" ON public.produtos_semijoias;
DROP POLICY IF EXISTS "Public delete produtos" ON public.produtos_semijoias;

DROP POLICY IF EXISTS "Public read pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Public insert pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Public update pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Public delete pedidos" ON public.pedidos;

DROP POLICY IF EXISTS "Public read transacoes_pix" ON public.transacoes_pix;
DROP POLICY IF EXISTS "Public insert transacoes_pix" ON public.transacoes_pix;
DROP POLICY IF EXISTS "Public update transacoes_pix" ON public.transacoes_pix;
DROP POLICY IF EXISTS "Public delete transacoes_pix" ON public.transacoes_pix;

CREATE POLICY "Users read own produtos" ON public.produtos_semijoias FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own produtos" ON public.produtos_semijoias FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own produtos" ON public.produtos_semijoias FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own produtos" ON public.produtos_semijoias FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users read own pedidos" ON public.pedidos FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own pedidos" ON public.pedidos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own pedidos" ON public.pedidos FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own pedidos" ON public.pedidos FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users read own transacoes_pix" ON public.transacoes_pix FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own transacoes_pix" ON public.transacoes_pix FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own transacoes_pix" ON public.transacoes_pix FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own transacoes_pix" ON public.transacoes_pix FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role full access transacoes_pix" ON public.transacoes_pix FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access pedidos" ON public.pedidos FOR ALL TO service_role USING (true) WITH CHECK (true);