'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const statusColors: Record<string, string> = {
  PLANNING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  ON_HOLD: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  COMPLETED: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  ARCHIVED: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

export default function ProjectsListPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/projects')
      .then((res) => setProjects(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Projects</h1>
          <p className="text-sm text-muted-foreground">Manage your workspaces and portfolios</p>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse border-border/50 h-48 bg-muted" />
          ))
        ) : projects.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No projects found. Create one to get started.
          </div>
        ) : (
          projects.map((project: any) => (
            <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
              <Card className="group cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 h-full flex flex-col">
                <CardContent className="p-6 flex-1 flex flex-col">
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
                  <div className="mt-auto pt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{project.stats?.done || 0} / {project.stats?.total || 0} tasks</span>
                      <span>{project.stats?.progress || 0}%</span>
                    </div>
                    <Progress value={project.stats?.progress || 0} className="h-1.5" />
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="flex -space-x-2">
                      {(project.members || []).slice(0, 3).map((m: any) => (
                        <Avatar key={m.userId} className="h-7 w-7 border-2 border-card">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                            {m.user?.name?.charAt(0)?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {(project.members || []).length > 3 && (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] text-muted-foreground">
                          +{project.members.length - 3}
                        </div>
                      )}
                    </div>
                    {project.endDate && (
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider bg-muted px-2 py-1 rounded">
                        Due {new Date(project.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
