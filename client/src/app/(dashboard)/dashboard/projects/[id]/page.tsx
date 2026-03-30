'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { api, API_BASE } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Calendar, 
  ChevronRight, 
  Clock, 
  Filter, 
  Layout, 
  List, 
  MoreHorizontal, 
  Plus, 
  Search, 
  Settings, 
  Share2, 
  Play,
  Square,
  X,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Flag
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameDay, addMonths, subMonths, 
  isSameMonth, differenceInDays, startOfDay
} from 'date-fns';

const statusColumns = [
  { key: 'TODO', label: 'To Do', color: 'bg-zinc-500' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-500' },
  { key: 'IN_REVIEW', label: 'In Review', color: 'bg-amber-500' },
  { key: 'DONE', label: 'Done', color: 'bg-emerald-500' },
];

const priorityColors: Record<string, string> = {
  LOW: 'bg-zinc-500/10 text-zinc-400',
  MEDIUM: 'bg-blue-500/10 text-blue-400',
  HIGH: 'bg-amber-500/10 text-amber-400',
  URGENT: 'bg-red-500/10 text-red-400',
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('MEDIUM');
  const [newTaskStatus, setNewTaskStatus] = useState('TODO');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');
  const [newTaskStartDate, setNewTaskStartDate] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showNewSubtask, setShowNewSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [comment, setComment] = useState('');
  const [view, setView] = useState('board');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteUserId, setInviteUserId] = useState('');
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [taskSpent, setTaskSpent] = useState<string>('0');
  const [timerStart, setTimerStart] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [activities, setActivities] = useState<any[]>([]);
  const [taskDeps, setTaskDeps] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [projRes, tasksRes, usersRes, allTasksRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/tasks?parentOnly=true`),
        api.get('/team/members'),
        api.get(`/projects/${id}/tasks`),
      ]);
      setProject(projRes.data);
      setTasks(tasksRes.data);
      setAllUsers(usersRes.data);
      setAllTasks(allTasksRes.data);
      
      const actRes = await api.get(`/activity?projectId=${id}`);
      setActivities(actRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    let interval: any;
    if (timerStart) {
      interval = setInterval(() => {
        setElapsed(Math.floor((new Date().getTime() - timerStart.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerStart]);

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post(`/projects/${id}/tasks`, {
        title: newTaskTitle, description: newTaskDesc,
        priority: newTaskPriority, status: newTaskStatus,
        assigneeId: newTaskAssigneeId || undefined,
        startDate: newTaskStartDate || undefined,
        dueDate: newTaskDueDate || undefined,
      });
      setNewTaskTitle(''); setNewTaskDesc(''); setNewTaskAssigneeId(''); setNewTaskStartDate(''); setNewTaskDueDate(''); setShowNewTask(false);
      loadData();
    } catch (err) { console.error(err); }
  }

  async function updateTaskStatus(taskId: string, newStatus: string) {
    try {
      await api.patch(`/tasks/${taskId}/position`, { status: newStatus, position: 0 });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (err) { console.error(err); }
  }

  async function loadTaskDetail(taskId: string) {
    const res = await api.get(`/tasks/${taskId}`);
    setSelectedTask(res.data);
    setTaskSpent(res.data.spent?.toString() || '0');
    
    const depRes = await api.get(`/tasks/${taskId}/dependencies`);
    setTaskDeps(depRes.data);
  }

  async function updateProjectVisibility(visibility: string) {
    try {
      await api.patch(`/projects/${id}`, { visibility });
      setProject((prev: any) => ({ ...prev, visibility }));
    } catch (err) { console.error(err); }
  }

  async function addComment() {
    if (!comment.trim() || !selectedTask) return;
    await api.post(`/tasks/${selectedTask.id}/comments`, { content: comment });
    setComment('');
    loadTaskDetail(selectedTask.id);
  }

  async function updateTaskSpent() {
    if (!selectedTask) return;
    try {
      await api.put(`/tasks/${selectedTask.id}`, { spent: Number(taskSpent) });
      loadTaskDetail(selectedTask.id);
      loadData(); // Refresh project spent rollup
    } catch (err) { console.error(err); }
  }

  async function startTimer() {
    setTimerStart(new Date());
    setElapsed(0);
  }

  async function stopTimer() {
    if (!timerStart || !selectedTask) return;
    const duration = Math.round(elapsed / 60); // minutes
    await api.post('/time-entries', {
      taskId: selectedTask.id,
      startTime: timerStart.toISOString(),
      endTime: new Date().toISOString(),
      duration: Math.max(1, duration),
      notes: 'Timer entry',
    });
    setTimerStart(null);
    setElapsed(0);
    loadTaskDetail(selectedTask.id);
  }

  async function addDependency(dependsOnId: string) {
    if (!selectedTask || !dependsOnId) return;
    await api.post(`/tasks/${selectedTask.id}/dependencies`, { dependsOnId, type: 'BLOCKS' });
    loadTaskDetail(selectedTask.id);
  }

  async function removeDependency(depId: string) {
    if (!selectedTask) return;
    await api.delete(`/tasks/${selectedTask.id}/dependencies/${depId}`);
    loadTaskDetail(selectedTask.id);
  }

  function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function handleCommentChange(val: string) {
    setComment(val);
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1 && lastAt === val.length - 1) {
      setShowMentionSuggestions(true);
      setMentionQuery('');
    } else if (lastAt !== -1 && showMentionSuggestions) {
      setMentionQuery(val.substring(lastAt + 1));
    } else {
      setShowMentionSuggestions(false);
    }
  }

  function applyMention(user: any) {
    const lastAt = comment.lastIndexOf('@');
    const newVal = comment.substring(0, lastAt) + '@' + user.name + ' ';
    setComment(newVal);
    setShowMentionSuggestions(false);
  }

  const mentionSuggestions = (project?.visibility === 'PUBLIC' ? allUsers : project?.members?.map((m: any) => m.user) || [])
    .filter((u: any) => u.name.toLowerCase().includes(mentionQuery.toLowerCase()));

  async function createSubtask() {
    if (!newSubtaskTitle.trim() || !selectedTask) return;
    await api.post(`/projects/${id}/tasks`, {
      title: newSubtaskTitle,
      parentTaskId: selectedTask.id,
      status: 'TODO',
      priority: 'MEDIUM'
    });
    setNewSubtaskTitle('');
    setShowNewSubtask(false);
    loadTaskDetail(selectedTask.id);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedTask) return;
    const formData = new FormData();
    formData.append('file', file);
    await api.post(`/tasks/${selectedTask.id}/attachments`, formData);
    loadTaskDetail(selectedTask.id);
  }

  async function deleteAttachment(id: string) {
    if (!window.confirm('Delete this attachment?')) return;
    await api.delete(`/attachments/${id}`);
    loadTaskDetail(selectedTask.id);
  }

  async function inviteMember() {
    if (!inviteUserId) return;
    try {
      await api.post(`/projects/${id}/members`, { userId: inviteUserId, role: 'MEMBER' });
      setInviteUserId('');
      setShowInviteDialog(false);
      loadData();
    } catch (err) { console.error(err); }
  }

  function exportToCSV() {
    const headers = ['Title', 'Status', 'Priority', 'Assignee', 'Start Date', 'Due Date', 'Description'];
    const rows = tasks.map(t => [
      t.title,
      t.status,
      t.priority,
      t.assignee?.name || 'Unassigned',
      t.startDate ? format(new Date(t.startDate), 'yyyy-MM-dd') : '',
      t.dueDate ? format(new Date(t.dueDate), 'yyyy-MM-dd') : '',
      t.description || ''
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.map(String).map(s => `"${s.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${project.name}_tasks_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-4 w-96 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-64 animate-pulse rounded-lg bg-muted" />)}
        </div>
      </div>
    );
  }

  if (!project) return <p className="text-muted-foreground">Project not found</p>;

  return (
    <div className="space-y-6 print:space-y-4">
      <style jsx global>{`
        @media print {
          .no-print, button, [role="tablist"], .DialogTrigger { display: none !important; }
          body { background: white !important; color: black !important; }
          .Card { border: 1px solid #eee !important; box-shadow: none !important; }
          aside, nav { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; width: 100% !important; }
          .Progress { border: 1px solid #000 !important; }
        }
      `}</style>
      {/* Project Header */}
      <div className="flex items-start justify-between animate-fade-in-up">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundColor: project.color || '#6366f1' }}>
            {project.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              <Badge variant="outline" className={project.visibility === 'PUBLIC' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}>
                {project.visibility === 'PUBLIC' ? 'Public' : 'Private'}
              </Badge>
              {project.ownerId === user?.id && (
                <Select value={project.visibility} onValueChange={(v) => v && updateProjectVisibility(v)}>
                  <SelectTrigger className="w-24 h-6 text-[10px] border-none bg-transparent hover:bg-muted p-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLIC">Public</SelectItem>
                    <SelectItem value="PRIVATE">Private</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{project.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Invite Member Dialog */}
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger render={
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                Invite
              </Button>
            } />
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Invite to {project.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Team Member</Label>
                  <Select value={inviteUserId} onValueChange={(v) => v && setInviteUserId(v)}>
                    <SelectTrigger><SelectValue placeholder="Choose a member..." /></SelectTrigger>
                    <SelectContent>
                      {allUsers.filter(u => !project.members?.some((m: any) => m.userId === u.id)).map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={inviteMember} disabled={!inviteUserId}>Send Invitation</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showNewTask} onOpenChange={setShowNewTask}>
            <DialogTrigger render={
              <Button className="gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Task
              </Button>
            } />
            <DialogContent>
              <DialogHeader><DialogTitle>Create New Task</DialogTitle></DialogHeader>
              <form onSubmit={createTask} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Task title" required />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} placeholder="Optional description" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Assignee</Label>
                    <Select value={newTaskAssigneeId} onValueChange={(v) => v && setNewTaskAssigneeId(v)}>
                      <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {(project.members || []).map((m: any) => (
                          <SelectItem key={m.user.id} value={m.user.id}>{m.user.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input type="date" value={newTaskStartDate} onChange={(e) => setNewTaskStartDate(e.target.value)} className="w-full" />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input type="date" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} className="w-full" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={newTaskPriority} onValueChange={(v) => v && setNewTaskPriority(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={newTaskStatus} onValueChange={(v) => v && setNewTaskStatus(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {statusColumns.map((s) => (
                          <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full">Create Task</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12L12 15.75m0 0l4.5-3.75M12 15.75V3" />
            </svg>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{project.stats?.total || 0}</span> tasks
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-emerald-400">{project.stats?.done || 0}</span> completed
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-2 text-sm">
          <Progress value={project.stats?.progress || 0} className="h-2 w-24" />
          <span className="text-muted-foreground">{project.stats?.progress || 0}%</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <div className="flex -space-x-2">
            {(project.members || []).slice(0, 5).map((m: any) => (
              <Avatar key={m.userId || m.id} className="h-7 w-7 border-2 border-background">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {m.user?.name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="gantt">Gantt</TabsTrigger>
        </TabsList>

        {/* Kanban Board View */}
        <TabsContent value="board" className="mt-4 animate-fade-in-up stagger-1">
          <div className="grid grid-cols-4 gap-4">
            {statusColumns.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.key);
              return (
                <div key={col.key} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                    <span className="text-sm font-medium">{col.label}</span>
                    <Badge variant="secondary" className="ml-auto h-5 min-w-5 rounded-full px-1.5 text-xs">
                      {colTasks.length}
                    </Badge>
                  </div>
                  <div className="space-y-2 min-h-[200px] rounded-lg bg-muted/30 p-2">
                    {colTasks.map((task) => (
                      <Card key={task.id} className="cursor-pointer border-border/50 bg-card transition-all hover:border-primary/30 hover:shadow-md"
                        onClick={() => loadTaskDetail(task.id)}>
                        <CardContent className="p-3">
                          <h4 className="text-sm font-medium leading-tight">{task.title}</h4>
                          {task.description && (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                          )}
                          <div className="mt-3 flex items-center justify-between">
                            <Badge variant="outline" className={`text-[10px] ${priorityColors[task.priority] || ''}`}>
                              {task.priority}
                            </Badge>
                            <div className="flex items-center gap-1.5">
                              {task._count?.subtasks > 0 && (
                                <span className="text-[10px] text-muted-foreground">{task._count.subtasks} subtasks</span>
                              )}
                              {task._count?.comments > 0 && (
                                <span className="text-[10px] text-muted-foreground">💬 {task._count.comments}</span>
                              )}
                              {task.assignee && (
                                <Avatar className="h-5 w-5">
                                  <AvatarFallback className="bg-primary/10 text-primary text-[8px]">
                                    {task.assignee?.name?.charAt(0)?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          </div>
                          {/* Inline status change */}
                          <div className="mt-2 flex gap-1">
                            {statusColumns.filter((s) => s.key !== task.status).map((s) => (
                              <button key={s.key} onClick={(e) => { e.stopPropagation(); updateTaskStatus(task.id, s.key); }}
                                className={`h-1.5 flex-1 rounded-full ${s.color} opacity-30 hover:opacity-100 transition-opacity`}
                                title={`Move to ${s.label}`} />
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* List View */}
        <TabsContent value="list" className="mt-4 animate-fade-in-up stagger-1">
          <Card className="border-border/50">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {tasks.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">No tasks yet. Create one to get started.</div>
                ) : tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => loadTaskDetail(task.id)}>
                    <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${statusColumns.find((s) => s.key === task.status)?.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      {task.description && <p className="text-xs text-muted-foreground truncate">{task.description}</p>}
                    </div>
                    <Badge variant="outline" className={`text-xs ${priorityColors[task.priority] || ''}`}>{task.priority}</Badge>
                    {task.assignee && (
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">{task.assignee?.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                    )}
                    <Select value={task.status} onValueChange={(v) => v && updateTaskStatus(task.id, v)}>
                      <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {statusColumns.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar View */}
        <TabsContent value="calendar" className="mt-4 animate-fade-in-up stagger-1">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <CardTitle className="text-sm font-medium">{format(currentDate, 'MMMM yyyy')}</CardTitle>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 19l-7-7 7-7" /></svg>
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 5l7 7-7 7" /></svg>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-7 border-b border-border bg-muted/30">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {(() => {
                  const start = startOfWeek(startOfMonth(currentDate));
                  const end = endOfWeek(endOfMonth(currentDate));
                  const days = eachDayOfInterval({ start, end });
                  return days.map(day => {
                    const dayTasks = tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), day));
                    return (
                      <div key={day.toString()} className={`min-h-[100px] border-b border-r border-border p-1 ${!isSameMonth(day, currentDate) ? 'bg-muted/10 opacity-50' : ''}`}>
                        <span className={`text-[10px] font-medium p-1 rounded-full ${isSameDay(day, new Date()) ? 'bg-primary text-primary-foreground h-5 w-5 inline-flex items-center justify-center' : ''}`}>
                          {format(day, 'd')}
                        </span>
                        <div className="mt-1 space-y-1">
                          {dayTasks.map(t => (
                            <div key={t.id} onClick={() => loadTaskDetail(t.id)}
                              className={`px-1.5 py-0.5 rounded text-[10px] truncate cursor-pointer ${statusColumns.find(s => s.key === t.status)?.color} text-white`}>
                              {t.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gantt View */}
        <TabsContent value="gantt" className="mt-4">
          <Card className="border-border/50 overflow-x-auto">
             <CardContent className="p-0 min-w-[800px]">
                <div className="flex border-b border-border bg-muted/30">
                  <div className="w-64 border-r border-border p-3 font-medium text-xs">Task</div>
                  <div className="flex-1 grid" style={{ gridTemplateColumns: 'repeat(30, minmax(0, 1fr))' }}>
                    {Array.from({ length: 30 }).map((_, i) => (
                      <div key={i} className="py-3 text-center text-[8px] text-muted-foreground border-r border-border/30">{i + 1}</div>
                    ))}
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {tasks.map(t => {
                    const start = t.startDate ? new Date(t.startDate) : new Date(t.createdAt);
                    const due = t.dueDate ? new Date(t.dueDate) : addMonths(start, 0); // fallback
                    const startOfMonthView = startOfMonth(currentDate);
                    const left = Math.max(0, differenceInDays(start, startOfMonthView));
                    const width = Math.max(1, differenceInDays(due, start) + 1);

                    return (
                      <div key={t.id} className="flex group">
                        <div className="w-64 border-r border-border p-2 text-xs truncate hover:text-primary cursor-pointer" onClick={() => loadTaskDetail(t.id)}>
                          {t.title}
                        </div>
                        <div className="flex-1 relative h-8 bg-muted/5">
                           <div className={`absolute top-2 h-4 rounded-full opacity-80 group-hover:opacity-100 transition-opacity ${statusColumns.find(s => s.key === t.status)?.color}`}
                             style={{ left: `${(left / 30) * 100}%`, width: `${(width / 30) * 100}%` }}
                             title={`${t.title}: ${format(start, 'MMM d')} - ${format(due, 'MMM d')}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
             </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Task Detail Panel */}
      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="max-w-xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">{selectedTask.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={priorityColors[selectedTask.priority]}>{selectedTask.priority}</Badge>
                  <Badge variant="outline">{selectedTask.status.replace('_', ' ')}</Badge>
                </div>
                {timerStart ? (
                  <div className="flex items-center gap-2 bg-red-500/10 text-red-500 px-3 py-1 rounded-full border border-red-500/20">
                    <Clock size={14} className="animate-pulse" />
                    <span className="font-mono text-xs font-bold">{formatDuration(elapsed)}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500 hover:bg-red-500/20" onClick={stopTimer}><Square size={12} /></Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="h-8 gap-2" onClick={startTimer}>
                    <Play size={14} /> Start Timer
                  </Button>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <p className="text-sm">{selectedTask.description || 'No description provided.'}</p>
              </div>

              <Tabs defaultValue="comments" className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none h-9 bg-transparent p-0">
                  <TabsTrigger value="comments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs">Comments</TabsTrigger>
                  <TabsTrigger value="subtasks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs">Subtasks</TabsTrigger>
                  <TabsTrigger value="time" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs">Time Logs</TabsTrigger>
                  <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="comments" className="pt-4 space-y-4">
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedTask.comments?.map((c: any) => (
                      <div key={c.id} className="flex gap-3">
                        <Avatar className="h-8 w-8"><AvatarFallback>{c.user?.name[0]}</AvatarFallback></Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                            <span className="font-bold text-foreground">{c.user?.name}</span>
                            <span>{new Date(c.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="bg-muted/30 p-2 rounded-lg text-sm">{c.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="relative">
                    {showMentionSuggestions && mentionSuggestions.length > 0 && (
                      <div className="absolute bottom-full left-0 w-48 bg-popover border rounded shadow-md z-50 mb-2">
                        {mentionSuggestions.map((u: any) => (
                          <button key={u.id} onClick={() => applyMention(u)} className="w-full text-left p-2 text-xs hover:bg-muted">{u.name}</button>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input value={comment} onChange={(e) => handleCommentChange(e.target.value)} placeholder="Add a comment... (use @)" className="h-9 text-sm" />
                      <Button onClick={addComment} size="sm">Send</Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="subtasks" className="pt-4 space-y-4">
                   <div className="flex items-center justify-between">
                     <h4 className="text-xs font-bold uppercase text-muted-foreground">Subtasks</h4>
                     <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setShowNewSubtask(!showNewSubtask)}>+ New</Button>
                   </div>
                   {showNewSubtask && (
                     <div className="flex gap-2"><Input value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)} placeholder="Title..." className="h-8 text-xs" /><Button size="sm" onClick={createSubtask} className="h-8">Add</Button></div>
                   )}
                   <div className="space-y-1.5">
                     {selectedTask.subtasks?.map((s: any) => (
                       <div key={s.id} className="flex items-center gap-2 p-2 hover:bg-muted/20 rounded border border-border/50 text-xs">
                         <div className={`h-2 w-2 rounded-full ${statusColumns.find(sc => sc.key === s.status)?.color}`} />
                         <span className="flex-1">{s.title}</span>
                         <Select value={s.status} onValueChange={(v) => updateTaskStatus(s.id, v)}>
                            <SelectTrigger className="h-6 w-20 text-[10px]"><SelectValue /></SelectTrigger>
                            <SelectContent>{statusColumns.map(sc => <SelectItem key={sc.key} value={sc.key}>{sc.label}</SelectItem>)}</SelectContent>
                         </Select>
                       </div>
                     ))}
                   </div>
                </TabsContent>

                <TabsContent value="time" className="pt-4 space-y-4">
                   <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-center">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Total Time</Label>
                        <div className="text-xl font-mono text-emerald-500 font-bold">
                           {(selectedTask.timeEntries?.reduce((s: number, e: any) => s + (e.duration || 0), 0) / 60).toFixed(1)}h
                        </div>
                      </div>
                      <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-lg text-center">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Estimated</Label>
                        <div className="text-xl font-mono text-indigo-500 font-bold">{selectedTask.estimatedHours || 0}h</div>
                      </div>
                   </div>
                   <div className="space-y-2 max-h-[200px] overflow-auto pr-1">
                      {selectedTask.timeEntries?.map((e: any) => (
                        <div key={e.id} className="flex items-center justify-between p-2 bg-muted/20 rounded text-xs border border-border">
                           <div className="flex items-center gap-2">
                             <Clock size={12} className="text-muted-foreground" />
                             <span>{new Date(e.startTime).toLocaleDateString()}</span>
                             <span className="text-muted-foreground font-medium">{e.user?.name}</span>
                           </div>
                           <span className="font-bold">{e.duration}m</span>
                        </div>
                      ))}
                   </div>
                </TabsContent>

                <TabsContent value="history" className="pt-4 space-y-3">
                   {activities.filter(a => a.entityId === selectedTask.id).length === 0 ? (
                     <div className="py-10 text-center text-zinc-500 text-xs italic">No activity recorded for this task yet.</div>
                   ) : (
                     activities.filter(a => a.entityId === selectedTask.id).map((a: any) => (
                       <div key={a.id} className="flex gap-3 text-xs p-2 bg-muted/10 rounded border border-border">
                          <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px]">{a.user?.name[0]}</AvatarFallback></Avatar>
                          <div>
                            <p><span className="font-bold">{a.user?.name}</span> {a.action.toLowerCase().replace('_', ' ')} task</p>
                            <span className="text-[10px] text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</span>
                          </div>
                       </div>
                     ))
                   )}
                </TabsContent>
              </Tabs>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Budget & Spend</h4>
                  <div className="bg-muted/20 p-3 rounded-lg border border-border space-y-3">
                    <div>
                      <Label className="text-[10px]">Task Spend ($)</Label>
                      <div className="flex gap-2 mt-1">
                        <Input type="number" value={taskSpent} onChange={(e) => setTaskSpent(e.target.value)} onBlur={updateTaskSpent} className="h-8 text-sm" />
                        <Button size="sm" variant="secondary" className="h-8" onClick={updateTaskSpent}>Save</Button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dependencies</h4>
                  <div className="bg-muted/20 p-3 rounded-lg border border-border space-y-2">
                    {taskDeps.map((d: any) => (
                      <div key={d.id} className="flex items-center justify-between text-xs p-1.5 bg-background rounded border group">
                        <span className="truncate">{d.dependsOn.title}</span>
                        <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100" onClick={() => removeDependency(d.id)}><X size={10} /></Button>
                      </div>
                    ))}
                    <select onChange={(e) => addDependency(e.target.value)} value="" className="w-full bg-background border rounded h-8 text-xs p-1">
                       <option value="">+ Add Blocking Task</option>
                       {allTasks.filter(t => t.id !== selectedTask.id && !taskDeps.some(d => d.dependsOnId === t.id)).map(t => (
                         <option key={t.id} value={t.id}>{t.title}</option>
                       ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                 <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Attachments</h4>
                 <div className="grid grid-cols-2 gap-2">
                   {selectedTask.attachments?.map((a: any) => (
                     <div key={a.id} className="flex items-center justify-between p-2 rounded border bg-muted/20 text-[10px]">
                        <span className="truncate flex-1">{a.filename}</span>
                        <a href={`${API_BASE.replace('/api', '')}${a.url}`} target="_blank" rel="noreferrer" className="text-primary ml-2">DL</a>
                     </div>
                   ))}
                   <Label className="cursor-pointer border border-dashed rounded flex items-center justify-center p-2 hover:bg-muted transition-colors text-[10px] text-muted-foreground">
                      + Upload
                      <Input type="file" className="hidden" onChange={handleFileUpload} />
                   </Label>
                 </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
