import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Save, RotateCcw } from 'lucide-react';
import { calcularPreco, formatCurrency, formatPercent, type PricingInput, type PricingResult } from '@/lib/pricing';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const initialInput = {
  nome_peca: '',
  custo_peca: 0,
  valor_pacote_tags: 0,
  quantidade_tags_pacote: 1,
  valor_verniz: 0,
  quantidade_pecas_por_verniz: 1,
  multiplicador_lucro: 2,
  meio_cobranca: 'tap_to_pay_nubank' as const,
  tipo_pagamento: 'debito' as const,
  numero_parcelas: 1,
};

export default function CalculadoraTab() {
  const [form, setForm] = useState(initialInput);
  const [result, setResult] = useState<PricingResult | null>(null);
  const [saving, setSaving] = useState(false);

  const updateField = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCalc = () => {
    if (!form.nome_peca.trim()) {
      toast.error('Informe o nome da peça');
      return;
    }
    const r = calcularPreco(form);
    setResult(r);
    toast.success('Preço calculado!');
  };

  const handleSave = async () => {
    if (!result) {
      toast.error('Calcule o preço primeiro');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('produtos_semijoias').insert({
      nome_peca: form.nome_peca,
      custo_peca: form.custo_peca,
      custo_tag_unitario: result.custo_tag_unitario,
      custo_verniz_por_peca: result.custo_verniz_por_peca,
      custo_total_peca: result.custo_total_peca,
      multiplicador_lucro: form.multiplicador_lucro,
      meio_cobranca: form.meio_cobranca,
      tipo_pagamento: form.tipo_pagamento,
      numero_parcelas: form.tipo_pagamento === 'credito_parcelado' ? form.numero_parcelas : null,
      taxa_cartao: result.taxa_cartao,
      preco_base: result.preco_base,
      preco_final: result.preco_final,
      lucro_estimado: result.lucro_estimado,
      margem_real: result.margem_real,
    });
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
    } else {
      toast.success('Peça salva com sucesso!');
    }
  };

  const handleClear = () => {
    setForm(initialInput);
    setResult(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Calculadora de Preços</h2>
        <p className="text-muted-foreground text-sm mt-1">Calcule o preço de venda das suas semijoias</p>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Dados da Peça</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nome da peça</Label>
            <Input value={form.nome_peca} onChange={(e) => updateField('nome_peca', e.target.value)} placeholder="Ex: Brinco Gota Cristal" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Custo da peça (R$)</Label>
              <NumberInput decimal step={0.01} min={0} value={form.custo_peca} onValueChange={(v) => updateField('custo_peca', v)} />
            </div>
            <div>
              <Label>Multiplicador de lucro</Label>
              <NumberInput decimal step={0.1} min={1} value={form.multiplicador_lucro} onValueChange={(v) => updateField('multiplicador_lucro', v)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Valor pacote tags (R$)</Label>
              <NumberInput decimal step={0.01} min={0} value={form.valor_pacote_tags} onValueChange={(v) => updateField('valor_pacote_tags', v)} />
            </div>
            <div>
              <Label>Qtd tags no pacote</Label>
              <NumberInput min={1} value={form.quantidade_tags_pacote} onValueChange={(v) => updateField('quantidade_tags_pacote', v)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Valor verniz (R$)</Label>
              <NumberInput decimal step={0.01} min={0} value={form.valor_verniz} onValueChange={(v) => updateField('valor_verniz', v)} />
            </div>
            <div>
              <Label>Peças por verniz</Label>
              <NumberInput min={1} value={form.quantidade_pecas_por_verniz} onValueChange={(v) => updateField('quantidade_pecas_por_verniz', v)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Forma de Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Meio de cobrança</Label>
            <Select value={form.meio_cobranca} onValueChange={(v) => updateField('meio_cobranca', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tap_to_pay_nubank">Tap to Pay Nubank</SelectItem>
                <SelectItem value="minizinha_2_pagbank">Minizinha 2 PagBank</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo de pagamento</Label>
            <Select value={form.tipo_pagamento} onValueChange={(v) => updateField('tipo_pagamento', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="debito">Débito</SelectItem>
                <SelectItem value="credito_vista">Crédito à vista</SelectItem>
                <SelectItem value="credito_parcelado">Crédito parcelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.tipo_pagamento === 'credito_parcelado' && (
            <div>
              <Label>Número de parcelas</Label>
              <NumberInput min={2} value={form.numero_parcelas} onValueChange={(v) => updateField('numero_parcelas', v)} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={handleCalc} className="flex-1 gap-2">
          <Calculator className="w-4 h-4" />
          Calcular preço de venda
        </Button>
        <Button onClick={handleSave} variant="secondary" disabled={!result || saving} className="flex-1 gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar peça'}
        </Button>
        <Button onClick={handleClear} variant="outline" className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Limpar
        </Button>
      </div>

      {result && (
        <Card className="glass-card border-primary/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Resultados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <ResultRow label="Custo tag unitário" value={formatCurrency(result.custo_tag_unitario)} />
              <ResultRow label="Custo verniz/peça" value={formatCurrency(result.custo_verniz_por_peca)} />
              <ResultRow label="Custo total da peça" value={formatCurrency(result.custo_total_peca)} />
              <ResultRow label="Preço base" value={formatCurrency(result.preco_base)} />
              <ResultRow label="Taxa cartão" value={formatPercent(result.taxa_cartao * 100)} />
              <ResultRow label="Valor taxas" value={formatCurrency(result.valor_taxas)} />
              <div className="col-span-2 border-t pt-4 mt-2 grid grid-cols-2 gap-4">
                <div className="bg-primary/10 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Preço Final</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(result.preco_final)}</p>
                </div>
                <div className="bg-success/10 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Lucro Estimado</p>
                  <p className="text-xl font-bold text-success">{formatCurrency(result.lucro_estimado)}</p>
                </div>
              </div>
              <div className="col-span-2 text-center text-muted-foreground">
                Margem real: <span className="font-semibold text-foreground">{formatPercent(result.margem_real)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
