
-- Create update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Table: produtos_semijoias
CREATE TABLE public.produtos_semijoias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_peca TEXT NOT NULL,
  custo_peca NUMERIC NOT NULL DEFAULT 0,
  custo_tag_unitario NUMERIC NOT NULL DEFAULT 0,
  custo_verniz_por_peca NUMERIC NOT NULL DEFAULT 0,
  custo_total_peca NUMERIC NOT NULL DEFAULT 0,
  multiplicador_lucro NUMERIC NOT NULL DEFAULT 2,
  meio_cobranca TEXT NOT NULL DEFAULT 'tap_to_pay_nubank',
  tipo_pagamento TEXT NOT NULL DEFAULT 'debito',
  numero_parcelas INTEGER,
  taxa_cartao NUMERIC NOT NULL DEFAULT 0,
  preco_base NUMERIC NOT NULL DEFAULT 0,
  preco_final NUMERIC NOT NULL DEFAULT 0,
  lucro_estimado NUMERIC NOT NULL DEFAULT 0,
  margem_real NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.produtos_semijoias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read produtos" ON public.produtos_semijoias FOR SELECT USING (true);
CREATE POLICY "Public insert produtos" ON public.produtos_semijoias FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update produtos" ON public.produtos_semijoias FOR UPDATE USING (true);
CREATE POLICY "Public delete produtos" ON public.produtos_semijoias FOR DELETE USING (true);

CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON public.produtos_semijoias
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table: pedidos
CREATE TABLE public.pedidos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_pedido TEXT NOT NULL,
  produto_id UUID REFERENCES public.produtos_semijoias(id) ON DELETE SET NULL,
  nome_peca TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  nome_cliente TEXT NOT NULL,
  email_cliente TEXT,
  whatsapp_cliente TEXT NOT NULL,
  meio_cobranca TEXT,
  tipo_pagamento TEXT,
  numero_parcelas INTEGER,
  status_pedido TEXT NOT NULL DEFAULT 'rascunho',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read pedidos" ON public.pedidos FOR SELECT USING (true);
CREATE POLICY "Public insert pedidos" ON public.pedidos FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update pedidos" ON public.pedidos FOR UPDATE USING (true);
CREATE POLICY "Public delete pedidos" ON public.pedidos FOR DELETE USING (true);

CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sequence for order codes
CREATE SEQUENCE public.pedido_seq START 1;

-- Table: transacoes_pix
CREATE TABLE public.transacoes_pix (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  valor NUMERIC NOT NULL DEFAULT 0,
  id_mercadopago TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  qr_code_base64 TEXT,
  pix_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transacoes_pix ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read transacoes_pix" ON public.transacoes_pix FOR SELECT USING (true);
CREATE POLICY "Public insert transacoes_pix" ON public.transacoes_pix FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update transacoes_pix" ON public.transacoes_pix FOR UPDATE USING (true);
CREATE POLICY "Public delete transacoes_pix" ON public.transacoes_pix FOR DELETE USING (true);

CREATE TRIGGER update_transacoes_pix_updated_at BEFORE UPDATE ON public.transacoes_pix
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
