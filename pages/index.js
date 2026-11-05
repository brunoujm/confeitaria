import { useState } from 'react';
import TaskList from '../components/TaskList';

export default function Home() {
  const [showReport, setShowReport] = useState(false);

  const tasks = [
    { id: 1, title: 'Criação de site institucional', client: 'Empresa Alfa Ltda', value: 2500, status: 'Em andamento' },
    { id: 2, title: 'Desenvolvimento de app móvel', client: 'Beta Soluções', value: 4200, status: 'Concluído' },
    { id: 3, title: 'Consultoria de UX/UI', client: 'Gamma Consultoria', value: 1800, status: 'Em espera' },
  ];

  const totalValue = tasks.reduce((sum, t) => sum + t.value, 0);
  const completed = tasks.filter(t => t.status === 'Concluído').length;
  const pending = tasks.filter(t => t.status === 'Em andamento' || t.status === 'Em espera').length;

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (showReport) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Relatório</h1>
              <p className="text-sm text-gray-500">Resumo de todas as tarefas</p>
            </div>
            <button
              onClick={() => setShowReport(false)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Voltar
            </button>
          </div>
          <ReportView onClose={() => setShowReport(false)} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
              FT
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">FreeaTask</h1>
              <p className="text-xs text-gray-500">Gerenciador de tarefas</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleGenerateReport}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Gerar relatório
            </button>
            <button
              onClick={() => {}}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + Nova Tarefa
            </button>
          </div>
        </header>

        <div className="grid gap-4 mb-10 md:grid-cols-3">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Total em projetos</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
            <p className="text-xs text-gray-500">{tasks.length} tarefas cadastradas</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Recebido</p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(completed > 0 ? tasks.find(t => t.status === 'Concluído')?.value || 0 : 0)}</p>
            <p className="text-xs text-gray-500">{completed} tarefa concluída</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">A receber</p>
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(tasks.filter(t => t.status !== 'Concluído').reduce((s, t) => s + t.value, 0))}</p>
            <p className="text-xs text-gray-500">{pending} em aberto</p>
          </div>
        </div>

        <TaskList />
      </div>
    </main>
  );

  function handleGenerateReport() {
    setShowReport(true);
  }
}

function ReportView({ onClose }) {
  const tasks = [
    { id: 1, title: 'Criação de site institucional', client: 'Empresa Alfa Ltda', value: 2500, status: 'Em andamento' },
    { id: 2, title: 'Desenvolvimento de app móvel', client: 'Beta Soluções', value: 4200, status: 'Concluído' },
    { id: 3, title: 'Consultoria de UX/UI', client: 'Gamma Consultoria', value: 1800, status: 'Em espera' },
  ];

  const totalValue = tasks.reduce((sum, t) => sum + t.value, 0);
  const completed = tasks.filter(t => t.status === 'Concluído').length;
  const inProgress = tasks.filter(t => t.status === 'Em andamento').length;
  const onHold = tasks.filter(t => t.status === 'Em espera').length;

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Relatório de Tarefas</h2>

      <div className="grid gap-4 mb-8 md:grid-cols-4">
        <div className="bg-blue-50 p-4 rounded-xl">
          <p className="text-xs text-blue-600 uppercase tracking-wider font-medium mb-2">Total de Tarefas</p>
          <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-xl">
          <p className="text-xs text-green-600 uppercase tracking-wider font-medium mb-2">Concluídas</p>
          <p className="text-2xl font-bold text-gray-900">{completed}</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-xl">
          <p className="text-xs text-amber-600 uppercase tracking-wider font-medium mb-2">Em Andamento</p>
          <p className="text-2xl font-bold text-gray-900">{inProgress}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-xl">
          <p className="text-xs text-gray-600 uppercase tracking-wider font-medium mb-2">Em Espera</p>
          <p className="text-2xl font-bold text-gray-900">{onHold}</p>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-xl mb-8">
        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">Valor Total</p>
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalhamento</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="pb-3 font-medium text-gray-700 text-sm">Tarefa</th>
              <th className="pb-3 font-medium text-gray-700 text-sm">Cliente</th>
              <th className="pb-3 font-medium text-gray-700 text-sm">Valor</th>
              <th className="pb-3 font-medium text-gray-700 text-sm">Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-b border-gray-50">
                <td className="py-3 text-gray-900 font-medium">{task.title}</td>
                <td className="py-3 text-gray-600">{task.client}</td>
                <td className="py-3 text-gray-900 font-medium">{formatCurrency(task.value)}</td>
                <td className="py-3">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                    task.status === 'Concluído' ? 'bg-green-100 text-green-700' :
                    task.status === 'Em andamento' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {task.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
