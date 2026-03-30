'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Users, 
  BarChart, 
  DollarSign,
  CheckCircle2,
  Clock,
  TrendingUp,
  Activity
} from 'lucide-react';

// Extend jsPDF with autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export default function ReportsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [workload, setWorkload] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/projects'),
      api.get('/reports/workload')
    ]).then(([projRes, workRes]) => {
      setProjects(projRes.data || []);
      setWorkload(workRes.data || []);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  function exportToCSV() {
    const headers = ['Project Name', 'Status', 'Tasks Count', 'Completed', 'Progress %', 'Budget ($)', 'Spent ($)'];
    const rows = projects.map(p => [
      p.name,
      p.status,
      p.stats?.total || 0,
      p.stats?.done || 0,
      `${p.stats?.progress || 0}%`,
      p.budget || 0,
      p.spent || 0
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.map(String).map(s => `"${s.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Project_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  }

  function exportToExcel() {
    const data = projects.map(p => ({
      'Project': p.name,
      'Status': p.status,
      'Total Tasks': p.stats?.total || 0,
      'Done': p.stats?.done || 0,
      'Progress %': p.stats?.progress || 0,
      'Budget ($)': Number(p.budget) || 0,
      'Spent ($)': Number(p.spent) || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Summary");
    XLSX.writeFile(workbook, `Project_Financials_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  }

  function exportToPDF() {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Project Portfolio Management Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'PPP p')}`, 14, 28);

    doc.autoTable({
      startY: 35,
      head: [['Project Name', 'Status', 'Tasks', 'Progress', 'Budget ($)', 'Spent ($)']],
      body: projects.map(p => [
        p.name,
        p.status,
        `${p.stats?.done}/${p.stats?.total}`,
        `${p.stats?.progress}%`,
        Number(p.budget).toLocaleString(),
        Number(p.spent).toLocaleString()
      ]),
      headStyles: { fillColor: [99, 102, 241] }
    });

    doc.save(`Executive_Summary_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  }

  if (loading) return <div className="p-8 text-center animate-pulse text-muted-foreground">Analyzing data...</div>;

  const totalBudget = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
  const totalSpent = projects.reduce((sum, p) => sum + (Number(p.spent) || 0), 0);
  const totalTasks = projects.reduce((sum, p) => sum + (p.stats?.total || 0), 0);
  const totalDone = projects.reduce((sum, p) => sum + (p.stats?.done || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">System Reports</h1>
          <p className="text-zinc-400 text-sm">Portfolio health and resource allocation analytics</p>
        </div>
        <div className="flex flex-wrap gap-2">
           <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2"><Download size={14} /> CSV</Button>
           <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2 text-emerald-500 hover:text-emerald-400"><FileSpreadsheet size={14} /> Excel</Button>
           <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2 text-indigo-500 hover:text-indigo-400"><FileText size={14} /> PDF</Button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Budget', value: `$${totalBudget.toLocaleString()}`, sub: `Across ${projects.length} projects`, icon: DollarSign, color: 'text-indigo-400' },
          { label: 'Actual Spent', value: `$${totalSpent.toLocaleString()}`, sub: `${((totalSpent / (totalBudget || 1)) * 100).toFixed(1)}% utilization`, icon: Activity, color: 'text-amber-400' },
          { label: 'Completion', value: `${totalDone} / ${totalTasks}`, sub: `${((totalDone / (totalTasks || 1)) * 100).toFixed(1)}% total progress`, icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Team Workload', value: workload.length.toString(), sub: 'Active contributors', icon: Users, color: 'text-blue-400' }
        ].map((stat, i) => (
          <Card key={i} className="bg-white/5 border-white/10 hover:border-white/20 transition-all">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between transition-transform group">
                <div>
                  <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{stat.label}</p>
                  <h3 className="text-2xl font-bold mt-1 text-zinc-100">{stat.value}</h3>
                  <p className="text-[10px] text-zinc-500 mt-1">{stat.sub}</p>
                </div>
                <div className={`p-3 rounded-2xl bg-white/5 ${stat.color}`}>
                  <stat.icon size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Project Table */}
        <Card className="lg:col-span-2 bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-zinc-400">Financial Summary</CardTitle>
            <TrendingUp size={16} className="text-zinc-500" />
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase font-bold text-zinc-500 bg-white/5">
                <tr>
                  <th className="p-4 text-left">Project</th>
                  <th className="p-4 text-left">Budget Status</th>
                  <th className="p-4 text-right">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {projects.map(p => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                       <span className="font-bold text-zinc-200">{p.name}</span>
                       <div className="text-[10px] text-zinc-500 capitalize">{p.status.toLowerCase()}</div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1.5 min-w-[150px]">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-zinc-400">${Number(p.spent).toLocaleString()}</span>
                          <span className="text-zinc-500">${Number(p.budget).toLocaleString()}</span>
                        </div>
                        <Progress value={(Number(p.spent) / (Number(p.budget) || 1)) * 100} className="h-1 bg-white/10" />
                      </div>
                    </td>
                    <td className="p-4 text-right">
                       <span className="font-mono font-bold text-indigo-400">{p.stats?.progress || 0}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Workload Chart */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-zinc-400">Resource Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {workload.map((w: any) => (
                <div key={w.user.id} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold">
                         {w.user.name[0]}
                       </div>
                       <span className="font-medium text-zinc-200">{w.user.name}</span>
                    </div>
                    <span className="font-bold text-zinc-400">{w.taskCount} tasks</span>
                  </div>
                  <Progress value={(w.taskCount / (Math.max(...workload.map(x => x.taskCount)) || 1)) * 100} className="h-2 bg-white/10" />
                </div>
              ))}
              {workload.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-zinc-500">
                  <Users size={32} className="mb-2 opacity-20" />
                  <p className="text-xs">No active workload data</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
