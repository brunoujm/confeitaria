import { useState } from 'react';

export default function TaskCard({ title, client, value, status, onDelete, onStatusChange }) {
  const [showConfirm, setShowConfirm] = useState(null); // null | 'delete' | 'status'
  const [pendingStatus, setPendingStatus] = useState(null);
  const valorFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

  const statusConfig = {
    'Em andamento': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', active: 'bg-blue-600 text-white border-blue-600' },
    'Concluído': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100', active: 'bg-green-600 text-white border-green-600' },
    'Em espera': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', active: 'bg-amber-600 text-white border-amber-600' },
    'Pendente': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100', active: 'bg-red-600 text-white border-red-600' },
  };

  const cfg = statusConfig[status] || statusConfig['Pendente'];

  const statusLabels = {
    'Em andamento': 'Em Andamento',
    'Concluído': 'Concluído',
    'Em espera': 'Em Espera',
    'Pendente': 'Pendente',
  };

  const statusPills = ['Pendente', 'Em andamento', 'Concluído', 'Em espera'];

  return (
    <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text} ${cfg.border}`}>
          {status}
        </span>
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
          {client}
        </span>
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-4 flex items-center gap-1.5">
        <span className="text-[10px]">👤</span>
        {client}
      </p>

      <div className="mt-auto pt-4 border-t border-gray-50">
        <div className="text-2xl font-bold text-gray-900 mb-4">{valorFormatado}</div>

        <div className="flex gap-2 w-full mb-3">
          {statusPills.map((s) => (
            <button
              key={s}
              onClick={() => { setPendingStatus(s); setShowConfirm('status'); }}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                status === s
                  ? cfg.active
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowConfirm('delete')}
          className="w-full px-3 py-2 rounded-lg border border-red-100 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
        >
          Excluir
        </button>
      </div>

      {showConfirm === 'delete' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <p className="text-gray-800 mb-4 text-center">Tem certeza que deseja excluir esta tarefa?</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowConfirm(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => { onDelete(); setShowConfirm(null); }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirm === 'status' && pendingStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <p className="text-gray-800 mb-4 text-center">Tem certeza que deseja marcar como {statusLabels[pendingStatus]}?</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowConfirm(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onStatusChange(pendingStatus);
                  setShowConfirm(null);
                  setPendingStatus(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
