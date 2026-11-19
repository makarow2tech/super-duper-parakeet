// src/api/client.js
var TOKEN_KEY = "krypt_token";
var isBrowser = typeof window !== "undefined";
var API_BASE = "".replace(/\/$/, "");
var ApiError = class extends Error {
	constructor(message, status, code) {
		super(message);
		this.status = status;
		this.code = code;
	}
};
var tokenStore = {
	get: () => {
		if (!isBrowser) return null;
		try {
			return window.localStorage.getItem(TOKEN_KEY);
		} catch {
			return null;
		}
	},
	set: (value) => {
		try {
			window.localStorage.setItem(TOKEN_KEY, value);
		} catch {}
	},
	clear: () => {
		try {
			window.localStorage.removeItem(TOKEN_KEY);
		} catch {}
	}
};
async function http(path, { method = "GET", body } = {}) {
	const token = tokenStore.get();
	const response = await fetch(`${API_BASE}${path}`, {
		method,
		headers: {
			...body !== void 0 ? { "Content-Type": "application/json" } : {},
			...token ? { Authorization: `Bearer ${token}` } : {}
		},
		body: body === void 0 ? void 0 : JSON.stringify(body)
	});
	const result = await response.json().catch(() => ({}));
	if (!response.ok) throw new ApiError((Array.isArray(result.detail) ? result.detail.map((d) => d.msg).join(", ") : result.detail) || "Bir şeyler ters gitti", response.status, result.code);
	return result;
}
var auth = {
	hasToken: () => !!tokenStore.get(),
	setToken: (token) => tokenStore.set(token),
	me: () => http("/api/auth/me"),
	async login(email, password) {
		const result = await http("/api/auth/login", {
			method: "POST",
			body: {
				email,
				password
			}
		});
		tokenStore.set(result.access_token);
		return result;
	},
	async register(payload, password) {
		const result = await http("/api/auth/register", {
			method: "POST",
			body: typeof payload === "string" ? {
				email: payload,
				password
			} : payload
		});
		if (result.access_token) tokenStore.set(result.access_token);
		return result;
	},
	async telegramStatus(code) {
		const result = await http("/api/auth/telegram/status", {
			method: "POST",
			body: { code }
		});
		if (result.access_token) tokenStore.set(result.access_token);
		return result;
	},
	telegramResend: (username, password) => http("/api/auth/telegram/resend", {
		method: "POST",
		body: {
			username,
			password
		}
	}),
	async verifyEmail(token) {
		const result = await http("/api/auth/verify-email", {
			method: "POST",
			body: { token }
		});
		if (result.access_token) tokenStore.set(result.access_token);
		return result;
	},
	resendVerification: (email) => http("/api/auth/resend-verification", {
		method: "POST",
		body: { email }
	}),
	resetPasswordRequest: (email) => http("/api/auth/forgot", {
		method: "POST",
		body: { email }
	}),
	resetPassword: ({ resetToken, newPassword }) => http("/api/auth/reset", {
		method: "POST",
		body: {
			token: resetToken,
			new_password: newPassword
		}
	}),
	logout(redirectTo) {
		tokenStore.clear();
		if (isBrowser) window.location.href = redirectTo ? `${redirectTo.replace(/\/$/, "")}/login` : "/login";
	}
};
var listeners = /* @__PURE__ */ new Set();
var socket = null;
var retry = 0;
var pingTimer = null;
function wsUrl() {
	return `${(API_BASE || window.location.origin).replace(/^http/, "ws")}/api/ws`;
}
function connect() {
	if (!isBrowser || socket || !listeners.size) return;
	const token = tokenStore.get();
	if (!token) return;
	socket = new WebSocket(wsUrl());
	socket.onopen = () => {
		retry = 0;
		socket.send(JSON.stringify({
			type: "auth",
			token
		}));
		pingTimer = setInterval(() => socket?.readyState === 1 && socket.send("ping"), 25e3);
	};
	socket.onmessage = (msg) => {
		let event;
		try {
			event = JSON.parse(msg.data);
		} catch {
			return;
		}
		if (!event.entity) return;
		listeners.forEach((fn) => fn(event));
	};
	socket.onclose = () => {
		clearInterval(pingTimer);
		socket = null;
		if (listeners.size) setTimeout(connect, Math.min(15e3, 1e3 * 2 ** retry++));
	};
	socket.onerror = () => socket?.close();
}
function subscribe(entityName, callback) {
	const listener = (event) => event.entity === entityName && callback({
		type: event.type,
		id: event.id,
		data: event.data
	});
	listeners.add(listener);
	connect();
	return () => {
		listeners.delete(listener);
		if (!listeners.size && socket) {
			socket.close();
			socket = null;
		}
	};
}
var enc = encodeURIComponent;
function entity(name) {
	const base = `/api/entities/${name}`;
	return {
		filter: (query = {}, { sort, limit = 50, skip = 0 } = {}) => http(`${base}/query`, {
			method: "POST",
			body: {
				query,
				sort,
				limit,
				skip
			}
		}),
		list: ({ sort, limit = 50, skip = 0 } = {}) => http(`${base}/query`, {
			method: "POST",
			body: {
				query: {},
				sort,
				limit,
				skip
			}
		}),
		get: (id) => http(`${base}/${enc(id)}`),
		create: (data) => http(base, {
			method: "POST",
			body: data
		}),
		bulkCreate: (rows) => http(`${base}/bulk`, {
			method: "POST",
			body: rows
		}),
		update: (id, data) => http(`${base}/${enc(id)}`, {
			method: "PATCH",
			body: data
		}),
		updateMany: (query, { $set }) => http(`${base}/update-many`, {
			method: "POST",
			body: {
				query,
				set: $set
			}
		}),
		delete: (id) => http(`${base}/${enc(id)}`, { method: "DELETE" }),
		count: async (query = {}) => (await http(`${base}/count`, {
			method: "POST",
			body: { query }
		})).count,
		subscribe: (callback) => subscribe(name, callback)
	};
}
async function downloadFile(path) {
	const token = tokenStore.get();
	const response = await fetch(`${API_BASE}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
	if (!response.ok) throw new ApiError((await response.json().catch(() => ({}))).detail || "Dosya indirilemedi", response.status);
	const filename = (response.headers.get("content-disposition") || "").match(/filename="?([^";]+)"?/i)?.[1] || "krypt-db.json";
	const blob = await response.blob();
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}
var api = {
	auth,
	admin: {
		summary: () => http("/api/admin/summary"),
		users: () => http("/api/admin/users"),
		setRole: (id, role) => http(`/api/admin/users/${enc(id)}/role`, {
			method: "PATCH",
			body: { role }
		}),
		setModeration: (id, body) => http(`/api/admin/users/${enc(id)}/moderation`, {
			method: "PATCH",
			body
		}),
		verifyUser: (id) => http(`/api/admin/users/${enc(id)}/verify`, { method: "PATCH" }),
		verificationLink: (id) => http(`/api/admin/users/${enc(id)}/verification-link`, { method: "POST" }),
		mailStatus: () => http("/api/admin/mail"),
		reports: () => http("/api/admin/reports"),
		setReportStatus: (id, status) => http(`/api/admin/reports/${enc(id)}`, {
			method: "PATCH",
			body: { status }
		}),
		invites: () => http("/api/admin/invites"),
		createInvite: (data) => http("/api/admin/invites", {
			method: "POST",
			body: data
		}),
		setInviteActive: (id, active) => http(`/api/admin/invites/${enc(id)}`, {
			method: "PATCH",
			body: { active }
		}),
		deleteInvite: (id) => http(`/api/admin/invites/${enc(id)}`, { method: "DELETE" }),
		getSettings: () => http("/api/admin/settings"),
		saveSettings: (data) => http("/api/admin/settings", {
			method: "PUT",
			body: data
		}),
		exportDatabase: () => downloadFile("/api/admin/export"),
		importDatabase: (data, mode = "merge") => http("/api/admin/import", {
			method: "POST",
			body: {
				mode,
				data
			}
		})
	},
	captcha: { get: () => http("/api/captcha") },
	settings: { get: () => http("/api/settings") },
	entities: new Proxy({}, { get: (_, name) => typeof name === "string" ? entity(name) : void 0 }),
	notify: (payload) => http("/api/notify", {
		method: "POST",
		body: payload
	})
};
export { api as t };
