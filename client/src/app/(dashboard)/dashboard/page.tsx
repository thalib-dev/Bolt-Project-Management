'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const statusColors: Record<string, string> = {
  PLANNING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  ON_HOLD: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  COMPLETED: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  ARCHIVED: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/projects')
      .then((res) => setProjects(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalTasks = projects.reduce((sum: number, p: any) => sum + (p.stats?.total || 0), 0);
  const doneTasks = projects.reduce((sum: number, p: any) => sum + (p.stats?.done || 0), 0);
  const activeProjects = projects.filter((p: any) => p.status === 'ACTIVE').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="mt-1 text-muted-foreground">Here&apos;s what&apos;s happening across your projects</p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button className="gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Project
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm animate-fade-in-up stagger-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Projects</CardTitle>
            <div className="rounded-lg bg-primary/10 p-2">
              <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75" />
              </svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{projects.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{activeProjects} active</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm animate-fade-in-up stagger-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
            <div className="rounded-lg bg-emerald-500/10 p-2">
              <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">{doneTasks} completed</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm animate-fade-in-up stagger-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
            <div className="rounded-lg bg-violet-500/10 p-2">
              <svg className="h-4 w-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
              </svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}%</div>
            <Progress value={totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm animate-fade-in-up stagger-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Team Members</CardTitle>
            <div className="rounded-lg bg-amber-500/10 p-2">
              <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952" />
              </svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{new Set(projects.flatMap((p: any) => (p.members || []).map((m: any) => m.userId))).size || 1}</div>
            <p className="text-xs text-muted-foreground mt-1">across all projects</p>
          </CardContent>
        </Card>
      </div>

      {/* Projects Grid */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your Projects</h2>
          <Link href="/dashboard/projects" className="text-sm text-primary hover:underline">View all</Link>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse border-border/50">
                <CardContent className="p-6">
                  <div className="h-4 w-2/3 rounded bg-muted" />
                  <div className="mt-3 h-3 w-full rounded bg-muted" />
                  <div className="mt-6 h-2 w-full rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="border-dashed border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-xl bg-muted p-4">
                <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold">No projects yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Create your first project to get started</p>
              <Link href="/dashboard/projects/new">
                <Button className="mt-4">Create Project</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project: any, index: number) => (
              <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                <Card className={`group cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 animate-fade-in-up stagger-${(index % 5) + 1}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: project.color || '#6366f1' }}>
                          {project.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold group-hover:text-primary transition-colors">{project.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${statusColors[project.status] || ''}`}>
                              {project.status?.replace('_', ' ')}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-zinc-500/10 text-zinc-400 border-zinc-500/20">
                              {project.visibility === 'PUBLIC' ? 'Public' : 'Private'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    {project.description && (
                      <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                    )}
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{project.stats?.done || 0} / {project.stats?.total || 0} tasks</span>
                        <span>{project.stats?.progress || 0}%</span>
                      </div>
                      <Progress value={project.stats?.progress || 0} className="h-1.5" />
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {(project.members || []).slice(0, 3).map((m: any) => (
                          <Avatar key={m.userId} className="h-7 w-7 border-2 border-card">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {m.user?.name?.charAt(0)?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {(project.members || []).length > 3 && (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-xs text-muted-foreground">
                            +{project.members.length - 3}
                          </div>
                        )}
                      </div>
                      {project.dueDate && (
                        <span className="text-xs text-muted-foreground">
                          Due {new Date(project.endDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
