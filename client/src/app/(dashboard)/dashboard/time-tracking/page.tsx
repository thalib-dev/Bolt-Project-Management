'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { PlayIcon, SquareIcon } from 'lucide-react';

export default function TimeTrackingPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [activeTimer, setActiveTimer] = useState<any>(null);
  const [elapsed, setElapsed] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/time-entries'),
      api.get('/projects').then(res => Promise.all(res.data.map((p: any) => api.get(`/projects/${p.id}/tasks`))))
    ]).then(([entriesRes, tasksRes]) => {
      setEntries(entriesRes.data);
      setSummary(entriesRes.summary);
      setTasks(tasksRes.flatMap((r: any) => r.data));
    }).finally(() => setLoading(false));

    // Check for active timer in localStorage
    const saved = localStorage.getItem('activeTimer');
    if (saved) {
      const timer = JSON.parse(saved);
      setActiveTimer(timer);
      setElapsed(Math.floor((Date.now() - new Date(timer.startTime).getTime()) / 1000));
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimer) {
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - new Date(activeTimer.startTime).getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  const toggleTimer = async () => {
    if (activeTimer) {
      // Stop timer
      try {
        await api.post('/time-entries', {
          taskId: activeTimer.taskId,
          startTime: activeTimer.startTime,
          endTime: new Date().toISOString(),
          notes: 'Tracked via timer',
        });
        setActiveTimer(null);
        localStorage.removeItem('activeTimer');
        setElapsed(0);
        // Reload entries
        const res = await api.get('/time-entries');
        setEntries(res.data);
        setSummary(res.summary);
      } catch (err) { console.error(err); }
    } else {
      // Start timer
      if (!selectedTaskId) return alert('Select a task first');
      const timer = { taskId: selectedTaskId, startTime: new Date().toISOString() };
      setActiveTimer(timer);
      localStorage.setItem('activeTimer', JSON.stringify(timer));
    }
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Time Tracking</h1>
          <p className="text-sm text-muted-foreground">Log your hours and manage timesheets</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Timer Widget */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Live Timer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl font-mono font-bold tracking-tight text-center tabular-nums text-primary/90">
              {formatTime(elapsed)}
            </div>
            {!activeTimer && (
              <select 
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
              >
                <option value="">Select a task to work on...</option>
                {tasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title} ({t.priority})</option>
                ))}
              </select>
            )}
            <Button 
              className="w-full gap-2 h-12 text-md font-medium shadow-sm transition-all" 
              variant={activeTimer ? "destructive" : "default"}
              onClick={toggleTimer}
            >
              {activeTimer ? (
                <><SquareIcon className="h-4 w-4 fill-current" /> Stop Timer</>
              ) : (
                <><PlayIcon className="h-4 w-4 fill-current" /> Start Timer</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Weekly Summary */}
        <Card className="md:col-span-2 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-3xl font-bold">{summary.totalHours || 0}<span className="text-xl text-muted-foreground font-normal ml-1">h</span></p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Billable Hours</p>
                <p className="text-3xl font-bold text-emerald-500">{summary.billableHours || 0}<span className="text-xl text-muted-foreground font-normal ml-1">h</span></p>
              </div>
            </div>
            {/* Simple sparkline visualization could go here */}
            <div className="mt-6 flex h-4 w-full rounded-full bg-muted overflow-hidden">
              <div className="bg-emerald-500" style={{ width: `${(summary.billableMinutes || 0) / (summary.totalMinutes || 1) * 100}%` }} />
              <div className="bg-primary/40" style={{ width: `${100 - ((summary.billableMinutes || 0) / (summary.totalMinutes || 1) * 100)}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"/> Billable</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary/40"/> Non-billable</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* recent Entries List */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Recent Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="space-y-4">
               {[1,2,3].map(i => <div key={i} className="h-12 w-full bg-muted animate-pulse rounded" />)}
             </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Project / Task</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No time entries recorded yet.</TableCell></TableRow>
                ) : (
                  entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {new Date(entry.startTime).toLocaleDateString()}
                        <div className="text-xs text-muted-foreground">
                          {new Date(entry.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{entry.task?.title}</div>
                        <div className="text-xs text-muted-foreground">{entry.task?.project?.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono bg-muted/50">
                          {Math.floor(entry.duration / 60)}h {entry.duration % 60}m
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {entry.billable ? (
                            <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 text-[10px]">Billable</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Non-billable</Badge>
                          )}
                          {entry.approved 
                            ? <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 text-[10px]">Approved</Badge>
                            : <div className="flex items-center gap-1">
                                <Badge variant="outline" className="text-[10px]">Pending</Badge>
                                {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                                  <Button size="sm" variant="ghost" className="h-6 text-[10px] text-primary hover:bg-primary/10" 
                                    onClick={async () => {
                                      await api.patch(`/time-entries/${entry.id}/approve`);
                                      const res = await api.get('/time-entries');
                                      setEntries(res.data);
                                    }}>
                                    Approve
                                  </Button>
                                )}
                              </div>
                          }
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
