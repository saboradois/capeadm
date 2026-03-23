import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Pencil, Trash2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatPercent, calcularPreco } from '@/lib/pricing';
import { toast } from 'sonner';

interface Produto {
  id: string;
  nome_peca: string;
  custo_peca: number;
  custo_total_peca: number;
  meio_cobranca: string;
  tipo_pagamento: string;
  numero_parcelas: number | null;
  preco_final: number;
  lucro_estimado: number;
  margem_real: number;
  multiplicador_lucro: number;
  custo_tag_unitario: number;
  custo_verniz_por_peca: number;
  taxa_cartao: number;
  preco_base: number;
}

export default function MinhasPecasTab() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMeio, setFilterMeio] = useState('todos');
  const [filterTipo, setFilterTipo] = useState('todos');
  const [editProduto, setEditProduto] = useState<Produto | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const fetchProdutos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('produtos_semijoias')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    else setProdutos(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchProdutos(); }, []);

  const filtered = produtos.filter((p) => {
    if (search && !p.nome_peca.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterMeio !== 'todos' && p.meio_cobranca !== filterMeio) return false;
    if (filterTipo !== 'todos' && p.tipo_pagamento !== filterTipo) return false;
    return true;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta peça?')) return;
    const { error } = await supabase.from('produtos_semijoias').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Peça excluída'); fetchProdutos(); }
  };

  const openEdit = (p: Produto) => {
    setEditProduto(p);
    setEditForm({
      nome_peca: p.nome_peca,
      custo_peca: p.custo_peca,
      multiplicador_lucro: p.multiplicador_lucro,
      meio_cobranca: p.meio_cobranca,
      tipo_pagamento: p.tipo_pagamento,
      numero_parcelas: p.numero_parcelas || 1,
      valor_pacote_tags: 0,
      quantidade_tags_pacote: 1,
      valor_verniz: 0,
      quantidade_pecas_por_verniz: 1,
    });
  };

  const handleEditSave = async () => {
    if (!editProduto) return;
    const result = calcularPreco(editForm);
    const { error } = await supabase.from('produtos_semijoias').update({
      nome_peca: editForm.nome_peca,
      custo_peca: editForm.custo_peca,
      multiplicador_lucro: editForm.multiplicador_lucro,
      meio_cobranca: editForm.meio_cobranca,
      tipo_pagamento: editForm.tipo_pagamento,
      numero_parcelas: editForm.tipo_pagamento === 'credito_parcelado' ? editForm.numero_parcelas : null,
      custo_tag_unitario: result.custo_tag_unitario,
      custo_verniz_por_peca: result.custo_verniz_por_peca,
      custo_total_peca: result.custo_total_peca,
      taxa_cartao: result.taxa_cartao,
      preco_base: result.preco_base,
      preco_final: result.preco_final,
      lucro_estimado: result.lucro_estimado,
      margem_real: result.margem_real,
    }).eq('id', editProduto.id);
    if (error) toast.error(error.message);
    else { toast.success('Peça atualizada!'); setEditProduto(null); fetchProdutos(); }
  };

  const meioLabel = (m: string) => m === 'tap_to_pay_nubank' ? 'Nubank' : 'Minizinha';
  const tipoLabel = (t: string) => {
    if (t === 'debito') return 'Débito';
    if (t === 'credito_vista') return 'Créd. à vista';
    return 'Créd. parcelado';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Minhas Peças</h2>
        <p className="text-muted-foreground text-sm mt-1">Gerencie suas semijoias cadastradas</p>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="pt-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterMeio} onValueChange={setFilterMeio}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos meios</SelectItem>
              <SelectItem value="tap_to_pay_nubank">Nubank</SelectItem>
              <SelectItem value="minizinha_2_pagbank">Minizinha</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos tipos</SelectItem>
              <SelectItem value="debito">Débito</SelectItem>
              <SelectItem value="credito_vista">Créd. à vista</SelectItem>
              <SelectItem value="credito_parcelado">Créd. parcelado</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Peça</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Preço Final</TableHead>
                <TableHead>Lucro</TableHead>
                <TableHead>Margem</TableHead>
                <TableHead>Meio</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma peça encontrada</TableCell></TableRow>
              ) : filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome_peca}</TableCell>
                  <TableCell>{formatCurrency(p.custo_total_peca)}</TableCell>
                  <TableCell className="font-semibold text-primary">{formatCurrency(p.preco_final)}</TableCell>
                  <TableCell className="text-success">{formatCurrency(p.lucro_estimado)}</TableCell>
                  <TableCell>{formatPercent(p.margem_real)}</TableCell>
                  <TableCell className="text-xs">{meioLabel(p.meio_cobranca)} · {tipoLabel(p.tipo_pagamento)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editProduto} onOpenChange={(o) => !o && setEditProduto(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Peça</DialogTitle></DialogHeader>
          {editProduto && (
            <div className="space-y-4">
              <div><Label>Nome</Label><Input value={editForm.nome_peca} onChange={(e) => setEditForm({ ...editForm, nome_peca: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Custo (R$)</Label><Input type="number" step="0.01" value={editForm.custo_peca} onChange={(e) => setEditForm({ ...editForm, custo_peca: parseFloat(e.target.value) || 0 })} /></div>
                <div><Label>Multiplicador</Label><Input type="number" step="0.1" value={editForm.multiplicador_lucro} onChange={(e) => setEditForm({ ...editForm, multiplicador_lucro: parseFloat(e.target.value) || 1 })} /></div>
              </div>
              <div>
                <Label>Meio de cobrança</Label>
                <Select value={editForm.meio_cobranca} onValueChange={(v) => setEditForm({ ...editForm, meio_cobranca: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tap_to_pay_nubank">Tap to Pay Nubank</SelectItem>
                    <SelectItem value="minizinha_2_pagbank">Minizinha 2 PagBank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo pagamento</Label>
                <Select value={editForm.tipo_pagamento} onValueChange={(v) => setEditForm({ ...editForm, tipo_pagamento: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debito">Débito</SelectItem>
                    <SelectItem value="credito_vista">Crédito à vista</SelectItem>
                    <SelectItem value="credito_parcelado">Crédito parcelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleEditSave} className="w-full">Recalcular e Salvar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
