import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Upload, ImageIcon, Loader2, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NameSuggestion {
  name: string;
  meaning: string;
}

export default function NomeadorIATab() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<NameSuggestion[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Envie apenas imagens');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
      setSuggestions([]);
    };
    reader.readAsDataURL(file);
  };

  const generateNames = async () => {
    if (!imagePreview) {
      toast.error('Envie uma foto da peça primeiro');
      return;
    }
    setLoading(true);
    setSuggestions([]);
    try {
      const { data, error } = await supabase.functions.invoke('jewelry-namer', {
        body: { image: imagePreview },
      });
      if (error) throw new Error(error.message);
      if (data?.names && Array.isArray(data.names)) {
        const parsed: NameSuggestion[] = data.names.map((n: any) =>
          typeof n === 'string' ? { name: n, meaning: '' } : { name: n.name || '', meaning: n.meaning || '' }
        );
        setSuggestions(parsed);
        toast.success('Nomes gerados com sucesso!');
      } else {
        throw new Error('Resposta inesperada da IA');
      }
    } catch (err: any) {
      toast.error('Erro ao gerar nomes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyName = (name: string) => {
    navigator.clipboard.writeText(name);
    toast.success('Nome copiado!');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Nomeador de Peças IA</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Envie uma foto da sua joia e receba 5 sugestões de nomes exclusivos
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            Foto da Peça
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />

          {imagePreview ? (
            <div className="relative group">
              <img
                src={imagePreview}
                alt="Peça"
                className="w-full max-h-80 object-contain rounded-lg border border-border"
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => fileRef.current?.click()}
              >
                Trocar foto
              </Button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-lg p-12 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium">Clique para enviar uma foto</p>
                <p className="text-sm text-muted-foreground">JPG, PNG ou WEBP</p>
              </div>
            </button>
          )}

          <Button
            onClick={generateNames}
            disabled={!imagePreview || loading}
            className="w-full gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analisando design...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Gerar 5 nomes exclusivos
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {suggestions.length > 0 && (
        <Card className="glass-card border-accent/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">✨ Sugestões de Nomes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {suggestions.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between bg-muted/50 rounded-lg px-4 py-3 gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-base">
                      <span className="text-accent mr-2">{i + 1}.</span>
                      {item.name}
                    </span>
                    {item.meaning && (
                      <p className="text-sm text-muted-foreground mt-1">{item.meaning}</p>
                    )}
                  </div>
                  <Button size="icon" variant="ghost" className="shrink-0 mt-0.5" onClick={() => copyName(item.name)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}