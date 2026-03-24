
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS meio_pagamento text DEFAULT 'pix';
ALTER TABLE public.transacoes_pix ADD COLUMN IF NOT EXISTS link_pagamento text;
ALTER TABLE public.transacoes_pix ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'pix';
