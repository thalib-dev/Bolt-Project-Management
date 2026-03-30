'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import Link from 'next/link';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function fetchNotifications() {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function markAsRead(id: string) {
    await api.patch(`/notifications/${id}/read`, {});
    fetchNotifications();
  }

  async function markAllAsRead() {
    await api.patch('/notifications/read-all', {});
    fetchNotifications();
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading notifications...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            Mark all as read
          </Button>
        )}
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="py-20 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted/30 mb-4">
                 <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                 </svg>
              </div>
              <p className="text-muted-foreground font-medium">No notifications yet</p>
              <p className="text-sm text-muted-foreground/60">We'll notify you when something important happens.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div key={n.id} className={`p-4 transition-colors hover:bg-muted/30 flex gap-4 ${!n.read ? 'bg-primary/5' : ''}`}>
                  <div className={`mt-1 h-3 w-3 rounded-full flex-shrink-0 ${!n.read ? 'bg-primary' : 'bg-transparent border border-muted'}`} />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-semibold ${!n.read ? 'text-foreground' : 'text-foreground/70'}`}>{n.title}</p>
                      <span className="text-[10px] text-muted-foreground">{format(new Date(n.createdAt), 'MMM d, h:mm a')}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    {n.link && (
                      <Link href={n.link} className="text-xs text-primary font-medium hover:underline inline-block mt-1">
                        View Details →
                      </Link>
                    )}
                  </div>
                  {!n.read && (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => markAsRead(n.id)}>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      <span className="sr-only">Mark as read</span>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
