import { useState } from 'react';
import { Calculator, Gem, ShoppingCart, BarChart3, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import CalculadoraTab from './tabs/CalculadoraTab';
import MinhasPecasTab from './tabs/MinhasPecasTab';
import PedidosPixTab from './tabs/PedidosPixTab';
import RelatorioTab from './tabs/RelatorioTab';
import NomeadorIATab from './tabs/NomeadorIATab';

const tabs = [
  { id: 'calculadora', label: 'Calculadora', icon: Calculator },
  { id: 'pecas', label: 'Peças', icon: Gem },
  { id: 'pedidos', label: 'Pedidos', icon: ShoppingCart },
  { id: 'ia', label: 'IA', icon: Sparkles },
  { id: 'relatorio', label: 'Relatório', icon: BarChart3 },
] as const;

type TabId = (typeof tabs)[number]['id'];

export default function AppLayout() {
  const [activeTab, setActiveTab] = useState<TabId>('calculadora');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Gem className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold leading-tight">Essenza</h1>
              <p className="text-xs text-muted-foreground">Vendas & Precificação</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'calculadora' && <CalculadoraTab />}
            {activeTab === 'pecas' && <MinhasPecasTab />}
            {activeTab === 'pedidos' && <PedidosPixTab />}
            {activeTab === 'relatorio' && <RelatorioTab />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="border-t bg-card/90 backdrop-blur-sm sticky bottom-0 z-50">
        <div className="container mx-auto flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors relative',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full"
                  />
                )}
                <Icon className="w-5 h-5" />
                <span className="hidden sm:block">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
