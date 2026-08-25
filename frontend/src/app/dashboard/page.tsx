'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { v4 as uuidv4 } from 'uuid';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  EyeOff,
  LogOut,
  PlusCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Wallet,
} from 'lucide-react';

interface StatementEntry {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  date: string;
}

export default function DashboardPage() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();

  const [balance, setBalance] = useState<number | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [statement, setStatement] = useState<StatementEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Estados dos Modais
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('100');
  const [depositError, setDepositError] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);

  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [receiverEmail, setReceiverEmail] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDesc, setTransferDesc] = useState('');
  const [transferError, setTransferError] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/');
    }
  }, [loading, isAuthenticated, router]);

  const loadWalletData = async () => {
    try {
      setIsRefreshing(true);
      const [balRes, statRes] = await Promise.all([
        api.get('/wallet/balance'),
        api.get('/wallet/statement'),
      ]);
      setBalance(balRes.data.balance);
      setStatement(statRes.data);
    } catch (err: any) {
      console.error('Erro ao carregar dados da carteira', err);
      // Se a sessão expirou, desloga automaticamente
      if (err.response?.status === 401) {
        logout();
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadWalletData();
    }
  }, [isAuthenticated]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositError('');
    setIsDepositing(true);

    try {
      await api.post('/wallet/deposit', { amount: Number(depositAmount) });
      setIsDepositOpen(false);
      setDepositAmount('100');
      await loadWalletData();
    } catch (err: any) {
      setDepositError(
        err.response?.data?.message || 'Falha ao processar o depósito.',
      );
    } finally {
      setIsDepositing(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError('');
    setIsTransferring(true);

    // Chave única para idempotência no Redis
    const idempotencyKey = uuidv4();

    try {
      await api.post(
        '/wallet/transfer',
        {
          receiverEmail,
          amount: Number(transferAmount),
          description: transferDesc || undefined,
        },
        {
          headers: {
            'x-idempotency-key': idempotencyKey,
          },
        },
      );
      setIsTransferOpen(false);
      setReceiverEmail('');
      setTransferAmount('');
      setTransferDesc('');
      await loadWalletData();
    } catch (err: any) {
      setTransferError(
        err.response?.data?.message || 'Falha ao processar transferência.',
      );
    } finally {
      setIsTransferring(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Carregando carteira segura...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-base leading-none block">
                Fintech Wallet
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {user.email}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadWalletData}
              disabled={isRefreshing}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all disabled:opacity-50"
              title="Atualizar saldo"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" /> Sair
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Seção do Card de Saldo */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-gradient-to-br from-indigo-900/40 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase tracking-wider font-semibold text-indigo-300">
                Saldo Disponível
              </span>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="text-slate-400 hover:text-white transition-all"
              >
                {showBalance ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono mb-6">
              {showBalance ? (
                balance !== null ? (
                  `R$ ${balance.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                ) : (
                  'R$ ---'
                )
              ) : (
                'R$ ••••••••'
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsTransferOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-600/25 transition-all"
              >
                <Send className="w-4 h-4" /> Fazer Transferência
              </button>
              <button
                onClick={() => setIsDepositOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl border border-slate-700 transition-all"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" /> Recarregar (Depósito)
              </button>
            </div>
          </div>

          {/* Card Informativo do Ledger */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <ShieldCheck className="w-4 h-4" /> Integridade do Ledger
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Todas as operações são registradas em partidas dobradas e
                armazenadas com chaves de idempotência únicas no Redis.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono truncate">
              ID da Carteira: {user.walletId}
            </div>
          </div>
        </section>

        {/* Extrato / Transações */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-base font-bold text-white mb-4">
            Extrato de Movimentações
          </h2>

          {statement.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Nenhuma movimentação registrada nesta carteira ainda.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {statement.map((item) => (
                <div
                  key={item.id}
                  className="py-3.5 flex items-center justify-between hover:bg-slate-800/30 px-2 rounded-xl transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        item.type === 'CREDIT'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {item.type === 'CREDIT' ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {item.description}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(item.date).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`font-mono font-semibold text-sm ${
                      item.type === 'CREDIT'
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {item.type === 'CREDIT' ? '+' : '-'} R${' '}
                    {item.amount.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Modal de Transferência */}
      {isTransferOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">
              Nova Transferência
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Transação protegida por lock distribuído e idempotência.
            </p>

            {transferError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 leading-relaxed">
                {transferError}
              </div>
            )}

            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  E-mail do Destinatário
                </label>
                <input
                  type="email"
                  required
                  value={receiverEmail}
                  onChange={(e) => setReceiverEmail(e.target.value)}
                  placeholder="destino@email.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Descrição (Opcional)
                </label>
                <input
                  type="text"
                  value={transferDesc}
                  onChange={(e) => setTransferDesc(e.target.value)}
                  placeholder="Ex: Almoço de domingo"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsTransferOpen(false);
                    setTransferError('');
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isTransferring}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
                >
                  {isTransferring ? 'Enviando...' : 'Confirmar Envio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Depósito / Recarga */}
      {isDepositOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">
              Recarregar Carteira
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Injete saldo de teste diretamente no Ledger para validar transferências.
            </p>

            {depositError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 leading-relaxed">
                {depositError}
              </div>
            )}

            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Valor a Creditar (R$)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDepositOpen(false);
                    setDepositError('');
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isDepositing}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
                >
                  {isDepositing ? 'Creditando...' : 'Creditar Saldo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}