import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Users, Eye, Search, ShoppingBag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/pricing';

interface Cliente {
  id: string;
  nome: string;
  whatsapp: string;
  email: string | null;
  created_at: string;
}

interface PedidoHistorico {
  id: string;
  codigo_pedido: string;
  nome_peca: string;
  quantidade: number;
  valor_total: number;
  status_pedido: string;
  meio_pagamento: string | null;
  created_at: string;
}

export default function ClientesTab() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [pedidos, setPedidos] = useState<PedidoHistorico[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);

  const fetchClientes = async () => {
    setLoading(true);
    const { data } = await supabase.from('clientes').select('*').order('nome');
    if (data) setClientes(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchClientes(); }, []);

  const openHistorico = async (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setLoadingPedidos(true);
    const { data } = await supabase
      .from('pedidos')
      .select('id, codigo_pedido, nome_peca, quantidade, valor_total, status_pedido, meio_pagamento, created_at')
      .eq('whatsapp_cliente', cliente.whatsapp)
      .order('created_at', { ascending: false });
    setPedidos((data as any) || []);
    setLoadingPedidos(false);
  };

  const filteredClientes = clientes.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.nome.toLowerCase().includes(s) || c.whatsapp.includes(s) || (c.email || '').toLowerCase().includes(s);
  });

  const totalGasto = pedidos
    .filter((p) => p.status_pedido === 'pago')
    .reduce((sum, p) => sum + Number(p.valor_total), 0);

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      rascunho: { label: 'Rascunho', variant: 'secondary' },
      aguardando_pagamento: { label: 'Aguardando', variant: 'outline' },
      pago: { label: 'Pago ✅', variant: 'default' },
      cancelado: { label: 'Cancelado', variant: 'destructive' },
    };
    const info = map[s] || { label: s, variant: 'secondary' as const };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  const meioPagamentoLabel = (m: string | null) => {
    const labels: Record<string, string> = { pix: '💠 Pix', dinheiro: '💵 Dinheiro', credito: '💳 Crédito', debito: '💳 Débito' };
    return labels[m || ''] || m || '—';
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6" /> Clientes</h2>
          <p className="text-muted-foreground text-sm mt-1">Contatos e histórico de compras</p>
        </div>
        <Badge variant="secondary" className="text-sm">{clientes.length} clientes</Badge>
      </div>

      <Card className="glass-card">
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Desde</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filteredClientes.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum cliente encontrado</TableCell></TableRow>
              ) : filteredClientes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="font-mono text-xs">{c.whatsapp}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.email || '—'}</TableCell>
                  <TableCell className="text-xs">{formatDate(c.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => openHistorico(c)} className="gap-1">
                      <Eye className="w-4 h-4" /> Histórico
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Client History Dialog */}
      <Dialog open={!!selectedCliente} onOpenChange={(o) => !o && setSelectedCliente(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Histórico — {selectedCliente?.nome}
            </DialogTitle>
          </DialogHeader>
          {selectedCliente && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">WhatsApp:</span> <span className="font-mono">{selectedCliente.whatsapp}</span></div>
                <div><span className="text-muted-foreground">E-mail:</span> {selectedCliente.email || '—'}</div>
                <div><span className="text-muted-foreground">Total de pedidos:</span> <span className="font-semibold">{pedidos.length}</span></div>
                <div><span className="text-muted-foreground">Total gasto:</span> <span className="font-bold text-primary">{formatCurrency(totalGasto)}</span></div>
              </div>

              {loadingPedidos ? (
                <p className="text-center text-muted-foreground py-4">Carregando pedidos...</p>
              ) : pedidos.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Nenhum pedido encontrado.</p>
              ) : (
                <div className="space-y-2">
                  {pedidos.map((p) => (
                    <Card key={p.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-xs text-muted-foreground">{p.codigo_pedido}</p>
                          <p className="font-medium text-sm">💍 {p.nome_peca} × {p.quantidade}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(p.created_at)} • {meioPagamentoLabel(p.meio_pagamento)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">{formatCurrency(p.valor_total)}</p>
                          <div className="mt-1">{statusBadge(p.status_pedido)}</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
