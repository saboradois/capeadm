import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ShoppingCart, QrCode, Copy, ExternalLink, Eye, RefreshCw, Banknote, CreditCard, Link2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/pricing';
import { toast } from 'sonner';

interface Produto {
  id: string;
  nome_peca: string;
  preco_final: number;
  meio_cobranca: string;
  tipo_pagamento: string;
  numero_parcelas: number | null;
  foto_url: string | null;
}

interface Pedido {
  id: string;
  codigo_pedido: string;
  nome_peca: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  nome_cliente: string;
  email_cliente: string | null;
  whatsapp_cliente: string;
  status_pedido: string;
  meio_pagamento: string | null;
  created_at: string;
}

interface TransacaoPix {
  id: string;
  pedido_id: string;
  valor: number;
  status: string;
  qr_code_base64: string | null;
  pix_text: string | null;
  id_mercadopago: string | null;
  link_pagamento: string | null;
  tipo: string | null;
}

type MetodoPagamento = 'pix' | 'dinheiro' | 'credito' | 'debito';

export default function PedidosPixTab() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [detailPedido, setDetailPedido] = useState<Pedido | null>(null);
  const [pixData, setPixData] = useState<TransacaoPix | null>(null);

  // Form state
  const [produtoId, setProdutoId] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [nomeCliente, setNomeCliente] = useState('');
  const [emailCliente, setEmailCliente] = useState('');
  const [whatsappCliente, setWhatsappCliente] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);
  const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamento>('pix');

  // Cash payment state
  const [precisaTroco, setPrecisaTroco] = useState(false);
  const [valorRecebido, setValorRecebido] = useState(0);

  // Filters
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterCliente, setFilterCliente] = useState('');

  // Status check
  const [checkingStatus, setCheckingStatus] = useState(false);

  const selectedProduto = produtos.find((p) => p.id === produtoId);
  const valorTotal = (selectedProduto?.preco_final || 0) * quantidade;
  const valorTroco = precisaTroco ? Math.max(0, valorRecebido - valorTotal) : 0;

  const fetchData = async () => {
    setLoading(true);
    const [prodRes, pedRes] = await Promise.all([
      supabase.from('produtos_semijoias').select('id, nome_peca, preco_final, meio_cobranca, tipo_pagamento, numero_parcelas, foto_url').order('nome_peca'),
      supabase.from('pedidos').select('*').order('created_at', { ascending: false }),
    ]);
    if (prodRes.data) setProdutos(prodRes.data);
    if (pedRes.data) setPedidos(pedRes.data as any);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Realtime subscription for payment updates
  useEffect(() => {
    const channel = supabase
      .channel('pedidos-status')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedidos' },
        (payload) => {
          const updated = payload.new as any;
          const old = payload.old as any;
          
          if (old.status_pedido !== 'pago' && updated.status_pedido === 'pago') {
            toast.success(
              `🎉 Pagamento confirmado!\nPedido ${updated.codigo_pedido} — ${updated.nome_peca} foi pago!`,
              { duration: 10000 }
            );
          }

          setPedidos((prev) =>
            prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const generateOrderCode = () => {
    const num = pedidos.length + 1;
    return `PED-${String(num).padStart(4, '0')}`;
  };

  const createOrder = async () => {
    if (!produtoId || !nomeCliente.trim() || !whatsappCliente.trim()) {
      toast.error('Preencha produto, nome e WhatsApp do cliente');
      return;
    }
    setSavingOrder(true);
    const codigoPedido = generateOrderCode();

    // Save or find client
    const whatsappClean = whatsappCliente.replace(/\D/g, '');
    let clienteId: string | null = null;
    try {
      const { data: existingCliente } = await supabase
        .from('clientes')
        .select('id')
        .eq('whatsapp', whatsappClean)
        .maybeSingle();

      if (existingCliente) {
        clienteId = existingCliente.id;
        // Update name/email if changed
        await supabase.from('clientes').update({
          nome: nomeCliente,
          email: emailCliente || null,
        }).eq('id', existingCliente.id);
      } else {
        const { data: newCliente } = await supabase.from('clientes').insert({
          nome: nomeCliente,
          whatsapp: whatsappClean,
          email: emailCliente || null,
        }).select('id').single();
        if (newCliente) clienteId = newCliente.id;
      }
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
    }

    const { data: pedido, error } = await supabase.from('pedidos').insert({
      codigo_pedido: codigoPedido,
      produto_id: produtoId,
      nome_peca: selectedProduto!.nome_peca,
      quantidade,
      valor_unitario: selectedProduto!.preco_final,
      valor_total: valorTotal,
      nome_cliente: nomeCliente,
      email_cliente: emailCliente || null,
      whatsapp_cliente: whatsappCliente.replace(/\D/g, ''),
      meio_cobranca: selectedProduto!.meio_cobranca,
      tipo_pagamento: selectedProduto!.tipo_pagamento,
      numero_parcelas: selectedProduto!.numero_parcelas,
      status_pedido: statusPedido,
      meio_pagamento: metodoPagamento,
    } as any).select().single();

    if (error || !pedido) {
      toast.error('Erro ao criar pedido: ' + (error?.message || 'Erro desconhecido'));
      setSavingOrder(false);
      return;
    }

    const pedidoData = pedido as any as Pedido;

    if (metodoPagamento === 'pix') {
      await generatePix(pedidoData);
    } else if (metodoPagamento === 'credito' || metodoPagamento === 'debito') {
      await generateCardLink(pedidoData);
    } else {
      toast.success(`✅ Pedido ${codigoPedido} criado — Pagamento em dinheiro${precisaTroco ? ` (Troco: ${formatCurrency(valorTroco)})` : ''}!`);
    }

    setSavingOrder(false);
    setShowForm(false);
    resetForm();
    fetchData();
  };

  const generatePix = async (pedido: Pedido) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke('mercadopago-pix', {
        body: {
          pedido_id: pedido.id,
          valor: pedido.valor_total,
          descricao: `Pedido ${pedido.codigo_pedido} - ${pedido.nome_peca}`,
          email_cliente: pedido.email_cliente || undefined,
          nome_cliente: pedido.nome_cliente,
          user_id: user?.id,
        },
      });
      if (error) throw new Error(error.message || 'Erro na API Pix');
      if (data?.error) throw new Error(data.error);
      toast.success(`Pedido ${pedido.codigo_pedido} criado com Pix! 💸`);
    } catch (err: any) {
      toast.error('Pedido criado, mas erro ao gerar Pix: ' + err.message);
    }
  };

  const generateCardLink = async (pedido: Pedido) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke('mercadopago-pix', {
        body: {
          action: 'create_card_link',
          pedido_id: pedido.id,
          valor: pedido.valor_total,
          descricao: `Pedido ${pedido.codigo_pedido} - ${pedido.nome_peca}`,
          nome_cliente: pedido.nome_cliente,
          user_id: user?.id,
        },
      });
      if (error) throw new Error(error.message || 'Erro na API');
      if (data?.error) throw new Error(data.error);
      toast.success(`Pedido ${pedido.codigo_pedido} criado com link de pagamento! 💳`);
    } catch (err: any) {
      toast.error('Pedido criado, mas erro ao gerar link: ' + err.message);
    }
  };

  const resetForm = () => {
    setProdutoId('');
    setQuantidade(1);
    setNomeCliente('');
    setEmailCliente('');
    setWhatsappCliente('');
    setMetodoPagamento('pix');
    setPrecisaTroco(false);
    setValorRecebido(0);
  };

  const openDetail = async (pedido: Pedido) => {
    setDetailPedido(pedido);
    const { data } = await supabase.from('transacoes_pix').select('*').eq('pedido_id', pedido.id).maybeSingle();
    setPixData(data as any || null);
  };

  const copyPixCode = () => {
    if (pixData?.pix_text) {
      navigator.clipboard.writeText(pixData.pix_text);
      toast.success('Código Pix copiado!');
    }
  };

  const copyPaymentLink = () => {
    if (pixData?.link_pagamento) {
      navigator.clipboard.writeText(pixData.link_pagamento);
      toast.success('Link de pagamento copiado!');
    }
  };

  const buildWhatsAppMessage = () => {
    if (!detailPedido) return '';
    const hour = new Date().getHours();
    const saudacao = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const agradecimentos = [
      'Agradecemos pela sua compra e confiança! 💖',
      'Obrigada por escolher a CAPE! Você merece brilhar! ✨',
      'Ficamos muito felizes com seu pedido! 💕',
      'Sua escolha foi incrível! Obrigada pela preferência! 🌟',
      'É uma alegria atender você! Muito obrigada! 💎',
    ];
    const agradecimento = agradecimentos[Math.floor(Math.random() * agradecimentos.length)];

    const baseMsg = `${saudacao}, ${detailPedido.nome_cliente}! 😊\nAqui é da *✨ CAPE Bijuterias Finas e Semijoias ✨*\n\n📋 *Pedido nº ${detailPedido.codigo_pedido}*\n\n🛍️ *Itens do pedido:*\n💍 ${detailPedido.nome_peca} — ${detailPedido.quantidade}x ${formatCurrency(detailPedido.valor_unitario)}\n\n💰 *Valor total: ${formatCurrency(detailPedido.valor_total)}*\n\n${agradecimento}`;

    const meio = detailPedido.meio_pagamento || 'pix';

    if (meio === 'pix') {
      return `${baseMsg}\n\n💳 Segue código Pix para realizar o pagamento 👇`;
    } else if (meio === 'dinheiro') {
      return `${baseMsg}\n\n💵 Pagamento recebido em *dinheiro*. ✅\n\nObrigada e volte sempre! 🤗`;
    } else if (meio === 'credito') {
      return `${baseMsg}\n\n💳 Segue o link para pagamento no *cartão de crédito* 👇${pixData?.link_pagamento ? `\n\n🔗 ${pixData.link_pagamento}` : ''}`;
    } else if (meio === 'debito') {
      return `${baseMsg}\n\n💳 Segue o link para pagamento no *cartão de débito* 👇${pixData?.link_pagamento ? `\n\n🔗 ${pixData.link_pagamento}` : ''}`;
    }

    return baseMsg;
  };

  const copyWhatsAppMessage = () => {
    const msg = buildWhatsAppMessage();
    if (!msg) return;
    navigator.clipboard.writeText(msg);
    toast.success('Mensagem copiada! Cole no WhatsApp.');
  };

  const openWhatsApp = () => {
    if (!detailPedido) return;
    const msg = encodeURIComponent(buildWhatsAppMessage());
    const phone = detailPedido.whatsapp_cliente.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const updatePixStatus = async () => {
    if (!detailPedido) return;
    if (!pixData?.id_mercadopago) {
      toast.info('Sem ID Mercado Pago para consultar.');
      return;
    }

    setCheckingStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke('mercadopago-pix', {
        body: { action: 'check_status', id_mercadopago: pixData.id_mercadopago },
      });
      if (error) throw new Error(error.message);

      if (data?.status === 'pago') {
        toast.success(`🎉 Pagamento confirmado! Pedido ${detailPedido.codigo_pedido} foi pago!`);
      } else if (data?.status === 'cancelado') {
        toast.error(`Pagamento cancelado/rejeitado.`);
      } else {
        toast.info(`Status atual no Mercado Pago: ${data?.mp_status || 'pendente'}`);
      }

      fetchData();
      const { data: updatedPedido } = await supabase.from('pedidos').select('*').eq('id', detailPedido.id).single();
      if (updatedPedido) setDetailPedido(updatedPedido as any);
      const { data: updatedPix } = await supabase.from('transacoes_pix').select('*').eq('pedido_id', detailPedido.id).maybeSingle();
      setPixData(updatedPix as any || null);
    } catch (err: any) {
      toast.error('Erro ao consultar status: ' + err.message);
    } finally {
      setCheckingStatus(false);
    }
  };

  const filteredPedidos = pedidos.filter((p) => {
    if (filterStatus !== 'todos' && p.status_pedido !== filterStatus) return false;
    if (filterCliente && !p.nome_cliente.toLowerCase().includes(filterCliente.toLowerCase())) return false;
    return true;
  });

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pedidos & Pagamentos</h2>
          <p className="text-muted-foreground text-sm mt-1">Crie pedidos e gere cobranças</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <ShoppingCart className="w-4 h-4" />
          Novo Pedido
        </Button>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="pt-4 flex flex-col sm:flex-row gap-3">
          <Input placeholder="Buscar cliente..." value={filterCliente} onChange={(e) => setFilterCliente(e.target.value)} className="flex-1" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="aguardando_pagamento">Aguardando</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Peça</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filteredPedidos.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum pedido encontrado</TableCell></TableRow>
              ) : filteredPedidos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.codigo_pedido}</TableCell>
                  <TableCell>{p.nome_cliente}</TableCell>
                  <TableCell>{p.nome_peca}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(p.valor_total)}</TableCell>
                  <TableCell className="text-xs">{meioPagamentoLabel(p.meio_pagamento)}</TableCell>
                  <TableCell>{statusBadge(p.status_pedido)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => openDetail(p)} className="gap-1">
                      <Eye className="w-4 h-4" /> Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* New Order Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Pedido</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Produto</Label>
              <Select value={produtoId} onValueChange={setProdutoId}>
                <SelectTrigger><SelectValue placeholder="Selecione uma peça..." /></SelectTrigger>
                <SelectContent>
                  {produtos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        {p.foto_url ? (
                          <img src={p.foto_url} alt={p.nome_peca} className="w-6 h-6 rounded object-cover shrink-0" />
                        ) : (
                          <div className="w-6 h-6 rounded bg-muted shrink-0" />
                        )}
                        <span>{p.nome_peca} — {formatCurrency(p.preco_final)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)} />
            </div>
            {selectedProduto && (
              <div className="bg-primary/5 rounded-lg p-3 text-sm">
                <p>Valor unitário: <span className="font-semibold">{formatCurrency(selectedProduto.preco_final)}</span></p>
                <p>Valor total: <span className="font-bold text-primary">{formatCurrency(valorTotal)}</span></p>
              </div>
            )}
            <div>
              <Label>Nome do cliente</Label>
              <Input value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} placeholder="Nome completo" />
            </div>
            <div>
              <Label>WhatsApp do cliente</Label>
              <Input value={whatsappCliente} onChange={(e) => setWhatsappCliente(e.target.value)} placeholder="5511999999999" />
            </div>
            <div>
              <Label>E-mail (opcional)</Label>
              <Input type="email" value={emailCliente} onChange={(e) => setEmailCliente(e.target.value)} placeholder="cliente@email.com" />
            </div>

            {/* Payment Method */}
            <div>
              <Label className="mb-2 block">Forma de pagamento</Label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'pix' as MetodoPagamento, label: 'Pix', icon: QrCode },
                  { value: 'dinheiro' as MetodoPagamento, label: 'Dinheiro', icon: Banknote },
                  { value: 'credito' as MetodoPagamento, label: 'Crédito', icon: CreditCard },
                  { value: 'debito' as MetodoPagamento, label: 'Débito', icon: CreditCard },
                ]).map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    type="button"
                    variant={metodoPagamento === value ? 'default' : 'outline'}
                    className="gap-2 justify-start"
                    onClick={() => { setMetodoPagamento(value); setPrecisaTroco(false); setValorRecebido(0); }}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Cash: change calculation */}
            {metodoPagamento === 'dinheiro' && (
              <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Precisa de troco?</Label>
                  <Switch checked={precisaTroco} onCheckedChange={setPrecisaTroco} />
                </div>
                {precisaTroco && (
                  <>
                    <div>
                      <Label className="text-xs text-muted-foreground">Valor recebido (R$)</Label>
                      <Input
                        type="number"
                        min={valorTotal}
                        step="0.01"
                        value={valorRecebido || ''}
                        onChange={(e) => setValorRecebido(parseFloat(e.target.value) || 0)}
                        placeholder="Ex: 100.00"
                      />
                    </div>
                    {valorRecebido > 0 && (
                      <div className="bg-primary/10 rounded-lg p-2 text-center">
                        <p className="text-xs text-muted-foreground">Troco</p>
                        <p className="text-xl font-bold text-primary">{formatCurrency(valorTroco)}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <Button onClick={createOrder} disabled={savingOrder} className="w-full gap-2">
              {metodoPagamento === 'pix' && <QrCode className="w-4 h-4" />}
              {metodoPagamento === 'dinheiro' && <Banknote className="w-4 h-4" />}
              {(metodoPagamento === 'credito' || metodoPagamento === 'debito') && <CreditCard className="w-4 h-4" />}
              {savingOrder ? 'Criando pedido...' : (
                metodoPagamento === 'pix' ? 'Criar pedido e gerar Pix' :
                metodoPagamento === 'dinheiro' ? 'Criar pedido (Dinheiro)' :
                'Criar pedido e gerar link de pagamento'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      <Dialog open={!!detailPedido} onOpenChange={(o) => !o && setDetailPedido(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detalhes do Pedido</DialogTitle></DialogHeader>
          {detailPedido && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Código:</span> <span className="font-mono font-semibold">{detailPedido.codigo_pedido}</span></div>
                <div><span className="text-muted-foreground">Status:</span> {statusBadge(detailPedido.status_pedido)}</div>
                <div><span className="text-muted-foreground">Cliente:</span> {detailPedido.nome_cliente}</div>
                <div><span className="text-muted-foreground">WhatsApp:</span> {detailPedido.whatsapp_cliente}</div>
                <div><span className="text-muted-foreground">Peça:</span> {detailPedido.nome_peca}</div>
                <div><span className="text-muted-foreground">Pagamento:</span> {meioPagamentoLabel(detailPedido.meio_pagamento)}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Valor total:</span> <span className="text-lg font-bold text-primary">{formatCurrency(detailPedido.valor_total)}</span></div>
              </div>

              {/* Pix section */}
              {pixData && pixData.tipo === 'pix' && (
                <Card className="border-primary/20">
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><QrCode className="w-4 h-4" /> Pagamento Pix</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {pixData.qr_code_base64 && (
                      <div className="flex justify-center">
                        <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="QR Code Pix" className="w-48 h-48 rounded-lg" />
                      </div>
                    )}
                    {pixData.pix_text && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Código Pix (copia e cola)</Label>
                        <div className="flex gap-2 mt-1">
                          <Input value={pixData.pix_text} readOnly className="text-xs font-mono" />
                          <Button size="icon" variant="outline" onClick={copyPixCode}><Copy className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge variant={pixData.status === 'pago' ? 'default' : 'outline'}>{pixData.status}</Badge>
                      <Button size="sm" variant="ghost" onClick={updatePixStatus} disabled={checkingStatus} className="gap-1">
                        <RefreshCw className={`w-3 h-3 ${checkingStatus ? 'animate-spin' : ''}`} />
                        {checkingStatus ? 'Consultando...' : 'Atualizar status'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Card payment link section */}
              {pixData && pixData.tipo === 'cartao' && (
                <Card className="border-primary/20">
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4" /> Link de Pagamento</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {pixData.link_pagamento && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Link de pagamento</Label>
                        <div className="flex gap-2 mt-1">
                          <Input value={pixData.link_pagamento} readOnly className="text-xs font-mono" />
                          <Button size="icon" variant="outline" onClick={copyPaymentLink}><Copy className="w-4 h-4" /></Button>
                        </div>
                        <Button size="sm" variant="outline" className="gap-1 mt-2 w-full" onClick={() => window.open(pixData.link_pagamento!, '_blank')}>
                          <Link2 className="w-3 h-3" /> Abrir link de pagamento
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge variant={pixData.status === 'pago' ? 'default' : 'outline'}>{pixData.status}</Badge>
                      <Button size="sm" variant="ghost" onClick={updatePixStatus} disabled={checkingStatus} className="gap-1">
                        <RefreshCw className={`w-3 h-3 ${checkingStatus ? 'animate-spin' : ''}`} />
                        {checkingStatus ? 'Consultando...' : 'Atualizar status'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cash section */}
              {detailPedido.meio_pagamento === 'dinheiro' && (
                <Card className="border-primary/20">
                  <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Banknote className="w-4 h-4" /> Pagamento em Dinheiro</CardTitle></CardHeader>
                  <CardContent>
                    <Badge variant="default">Pago ✅</Badge>
                  </CardContent>
                </Card>
              )}

              {!pixData && detailPedido.meio_pagamento !== 'dinheiro' && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma cobrança gerada para este pedido.</p>
              )}

              {/* WhatsApp actions */}
              <div className="flex flex-col gap-2">
                <Button onClick={copyWhatsAppMessage} variant="secondary" className="gap-2">
                  <Copy className="w-4 h-4" />
                  Copiar mensagem para WhatsApp
                </Button>
                <Button onClick={openWhatsApp} className="gap-2 bg-success hover:bg-success/90 text-success-foreground">
                  <ExternalLink className="w-4 h-4" />
                  Abrir WhatsApp Web
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
