import { l as useAuth } from "./router-CRnjuvSx.js";
import { T as listAccessibleChannels, k as listMyMemberships } from "./krypt-ELaGncLW.js";
import { useCallback, useEffect, useState } from "react";
// src/lib/useChannels.js
function useChannels() {
	const { user } = useAuth();
	const [state, setState] = useState({
		channels: [],
		memberships: [],
		loading: true
	});
	const load = useCallback(async () => {
		if (!user?.id) return;
		const [channels, memberships] = await Promise.all([listAccessibleChannels(user.id), listMyMemberships(user.id)]);
		setState({
			channels,
			memberships,
			loading: false
		});
	}, [user?.id]);
	useEffect(() => {
		load();
	}, [load]);
	return {
		...state,
		refresh: load
	};
}
function useUnreadNotifications() {
	const { user } = useAuth();
	const [count, setCount] = useState(0);
	useEffect(() => {
		if (!user?.id) return;
		let alive = true;
		const tick = async () => {
			try {
				const { unreadNotificationCount } = await import("./krypt-ELaGncLW.js").then((n) => n.C);
				const value = await unreadNotificationCount(user.id);
				if (alive) setCount(value);
			} catch {}
		};
		tick();
		const timer = setInterval(tick, 3e4);
		return () => {
			alive = false;
			clearInterval(timer);
		};
	}, [user?.id]);
	return count;
}
export { useUnreadNotifications as n, useChannels as t };
