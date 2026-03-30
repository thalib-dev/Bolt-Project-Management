'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

export default function TeamPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [workload, setWorkload] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/team/members'),
      api.get('/reports/workload')
    ]).then(([mRes, wRes]) => {
      setMembers(mRes.data);
      setWorkload(wRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const getWorkload = (userId: string) => workload.find(w => w.user?.id === userId)?.taskCount || 0;
  const maxWorkload = Math.max(...workload.map(w => w.taskCount), 1); // Avoid div by 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team Resources</h1>
        <p className="text-sm text-muted-foreground">Manage workload and view team availability</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Workload Allocation</CardTitle>
            <CardDescription>Active tasks per team member</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}</div>
            ) : (
              members.map((member) => {
                const count = getWorkload(member.id);
                const percent = (count / maxWorkload) * 100;
                // Color scale based on load
                const colorClass = count > 10 ? 'bg-red-500' : count > 5 ? 'bg-amber-500' : 'bg-emerald-500';

                return (
                  <div key={member.id} className="flex items-center gap-4">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {member.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{member.name}</span>
                        <span className="text-muted-foreground">{count} tasks</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${colorClass} transition-all`} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Directory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {member.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium leading-none">{member.name}</p>
                      <p className="text-xs text-muted-foreground mt-1.5">{member.email}</p>
                    </div>
                  </div>
                  <div className="text-xs font-mono uppercase px-2 py-1 rounded bg-secondary/50 text-secondary-foreground border border-border/50">
                    {member.role}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
