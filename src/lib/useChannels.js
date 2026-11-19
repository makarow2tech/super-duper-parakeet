import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { listAccessibleChannels, listMyMemberships } from "@/lib/kryptApi";

export function useChannels() {
  const { user } = useAuth();
  const [state, setState] = useState({ channels: [], memberships: [], loading: true });

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [channels, memberships] = await Promise.all([
      listAccessibleChannels(user.id),
      listMyMemberships(user.id),
    ]);
    setState({ channels, memberships, loading: false });
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refresh: load };
}

export function useUnreadNotifications() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    const tick = async () => {
      try {
        const { unreadNotificationCount } = await import("@/lib/kryptApi");
        const value = await unreadNotificationCount(user.id);
        if (alive) setCount(value);
      } catch {
        /* sessizce yok say */
      }
    };
    tick();
    const timer = setInterval(tick, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [user?.id]);

  return count;
}