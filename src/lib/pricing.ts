// Tax rates by payment method
const TAXAS = {
  tap_to_pay_nubank: {
    debito: 0.0089,
    credito_vista: 0.0315,
    credito_parcelado_ate_6: 0.0539,
    credito_parcelado_acima_6: 0.1240,
  },
  minizinha_2_pagbank: {
    debito: 0.0239,
    credito_vista: 0.0399,
    credito_parcelado_ate_6: 0.0559,
    credito_parcelado_acima_6: 0.0990,
  },
};

export interface PricingInput {
  custo_peca: number;
  valor_pacote_tags: number;
  quantidade_tags_pacote: number;
  valor_verniz: number;
  quantidade_pecas_por_verniz: number;
  multiplicador_lucro: number;
  meio_cobranca: 'tap_to_pay_nubank' | 'minizinha_2_pagbank';
  tipo_pagamento: 'debito' | 'credito_vista' | 'credito_parcelado';
  numero_parcelas?: number;
}

export interface PricingResult {
  custo_tag_unitario: number;
  custo_verniz_por_peca: number;
  custo_total_peca: number;
  preco_base: number;
  taxa_cartao: number;
  preco_final: number;
  valor_taxas: number;
  lucro_estimado: number;
  margem_real: number;
}

export function getTaxRate(
  meio: 'tap_to_pay_nubank' | 'minizinha_2_pagbank',
  tipo: 'debito' | 'credito_vista' | 'credito_parcelado',
  parcelas?: number
): number {
  const rates = TAXAS[meio];
  if (tipo === 'debito') return rates.debito;
  if (tipo === 'credito_vista') return rates.credito_vista;
  if (tipo === 'credito_parcelado') {
    return (parcelas ?? 1) <= 6
      ? rates.credito_parcelado_ate_6
      : rates.credito_parcelado_acima_6;
  }
  return 0;
}

export function calcularPreco(input: PricingInput): PricingResult {
  const custo_tag_unitario =
    input.quantidade_tags_pacote > 0
      ? input.valor_pacote_tags / input.quantidade_tags_pacote
      : 0;

  const custo_verniz_por_peca =
    input.quantidade_pecas_por_verniz > 0
      ? input.valor_verniz / input.quantidade_pecas_por_verniz
      : 0;

  const custo_total_peca =
    input.custo_peca + custo_tag_unitario + custo_verniz_por_peca;

  const preco_base = custo_total_peca * input.multiplicador_lucro;

  const taxa_cartao = getTaxRate(
    input.meio_cobranca,
    input.tipo_pagamento,
    input.numero_parcelas
  );

  const preco_final = preco_base / (1 - taxa_cartao);
  const valor_taxas = preco_final * taxa_cartao;
  const lucro_estimado = preco_final - custo_total_peca - valor_taxas;
  const margem_real =
    preco_final > 0 ? (lucro_estimado / preco_final) * 100 : 0;

  return {
    custo_tag_unitario: round2(custo_tag_unitario),
    custo_verniz_por_peca: round2(custo_verniz_por_peca),
    custo_total_peca: round2(custo_total_peca),
    preco_base: round2(preco_base),
    taxa_cartao,
    preco_final: round2(preco_final),
    valor_taxas: round2(valor_taxas),
    lucro_estimado: round2(lucro_estimado),
    margem_real: round2(margem_real),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}
