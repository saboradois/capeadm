import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gem, ShoppingCart, DollarSign, TrendingUp, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/pricing';

interface Stats {
  totalPecas: number;
  totalPedidos: number;
  pedidosPagos: number;
  faturamentoTotal: number;
  ticketMedio: number;
  porMeio: Record<string, number>;
}

export default function RelatorioTab() {
  const [stats, setStats] = useState<Stats>({
    totalPecas: 0,
    totalPedidos: 0,
    pedidosPagos: 0,
    faturamentoTotal: 0,
    ticketMedio: 0,
    porMeio: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [pecasRes, pedidosRes] = await Promise.all([
        supabase.from('produtos_semijoias').select('id', { count: 'exact', head: true }),
        supabase.from('pedidos').select('*'),
      ]);

      const pedidos = pedidosRes.data || [];
      const pagos = pedidos.filter((p) => p.status_pedido === 'pago');
      const faturamento = pagos.reduce((sum, p) => sum + Number(p.valor_total), 0);

      const porMeio: Record<string, number> = {};
      pedidos.forEach((p) => {
        const meio = p.meio_cobranca || 'Não informado';
        porMeio[meio] = (porMeio[meio] || 0) + 1;
      });

      setStats({
        totalPecas: pecasRes.count || 0,
        totalPedidos: pedidos.length,
        pedidosPagos: pagos.length,
        faturamentoTotal: faturamento,
        ticketMedio: pagos.length > 0 ? faturamento / pagos.length : 0,
        porMeio,
      });
      setLoading(false);
    };
    fetch();
  }, []);

  const meioLabel = (m: string) => {
    if (m === 'tap_to_pay_nubank') return 'Nubank';
    if (m === 'minizinha_2_pagbank') return 'Minizinha';
    return m;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando relatórios...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Relatório</h2>
        <p className="text-muted-foreground text-sm mt-1">Visão geral do seu negócio</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Gem} label="Total de Peças" value={String(stats.totalPecas)} />
        <MetricCard icon={ShoppingCart} label="Total de Pedidos" value={String(stats.totalPedidos)} />
        <MetricCard icon={DollarSign} label="Pedidos Pagos" value={String(stats.pedidosPagos)} accent />
        <MetricCard icon={TrendingUp} label="Faturamento" value={formatCurrency(stats.faturamentoTotal)} accent />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ticket Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{formatCurrency(stats.ticketMedio)}</p>
            <p className="text-xs text-muted-foreground mt-1">Valor médio dos pedidos pagos</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4" /> Por Meio de Cobrança</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(stats.porMeio).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pedido registrado</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(stats.porMeio).map(([meio, count]) => (
                  <div key={meio} className="flex justify-between items-center">
                    <span className="text-sm">{meioLabel(meio)}</span>
                    <span className="font-semibold">{count} pedido{count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) {
  return (
    <Card className="glass-card">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-lg font-bold ${accent ? 'text-primary' : ''}`}>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
