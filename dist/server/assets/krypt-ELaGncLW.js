import { t as __exportAll } from "./rolldown-runtime-D8jQpDG7.js";
import { t as api } from "./client-C8lvYai7.js";
// src/lib/kryptApi.js
var kryptApi_exports = /* @__PURE__ */ __exportAll({ unreadNotificationCount: () => unreadNotificationCount });
var items = (page) => page?.items ?? [];
async function getMyProfile(userId) {
	return items(await api.entities.Profile.filter({ user_id: userId }, { limit: 1 }))[0] ?? null;
}
async function getProfileByHandle(handle) {
	return items(await api.entities.Profile.filter({ handle: String(handle).toLowerCase() }, { limit: 1 }))[0] ?? null;
}
async function handleTaken(handle) {
	return items(await api.entities.Profile.filter({ handle: String(handle).toLowerCase() }, { limit: 1 })).length > 0;
}
async function createProfile(data) {
	return api.entities.Profile.create(data);
}
async function updateProfile(id, data) {
	return api.entities.Profile.update(id, data);
}
async function getMyVault(userId) {
	return items(await api.entities.Vault.filter({ user_id: userId }, { limit: 1 }))[0] ?? null;
}
async function createVault(data) {
	return api.entities.Vault.create(data);
}
async function listAccessibleChannels(userId) {
	return items(await api.entities.Channel.filter({ $or: [{ visibility: "public" }, { members: userId }] }, {
		sort: "-created_date",
		limit: 100
	}));
}
async function getChannelBySlug(slug) {
	return items(await api.entities.Channel.filter({ slug }, { limit: 1 }))[0] ?? null;
}
async function createChannelRecord(data) {
	return api.entities.Channel.create(data);
}
async function updateChannel(id, data) {
	return api.entities.Channel.update(id, data);
}
async function listMyMemberships(userId) {
	return items(await api.entities.ChannelMember.filter({ user_id: userId }, { limit: 200 }));
}
async function getMyMembership(channelId, userId) {
	return items(await api.entities.ChannelMember.filter({
		channel_id: channelId,
		user_id: userId
	}, { limit: 1 }))[0] ?? null;
}
async function addChannelMember(data) {
	return api.entities.ChannelMember.create(data);
}
async function deleteChannelMember(id) {
	return api.entities.ChannelMember.delete(id);
}
async function listCommunities(limit = 100) {
	return items(await api.entities.Community.list({
		sort: "-created_date",
		limit
	}));
}
async function getCommunityBySlug(slug) {
	return items(await api.entities.Community.filter({ slug }, { limit: 1 }))[0] ?? null;
}
async function createCommunityRecord(data) {
	return api.entities.Community.create(data);
}
async function listCommunityChannels(communityId, limit = 100) {
	return items(await api.entities.Channel.filter({ community_id: communityId }, {
		sort: "-created_date",
		limit
	}));
}
async function listMessages(channelId, limit = 60) {
	return items(await api.entities.Message.filter({ channel_id: channelId }, {
		sort: "-created_date",
		limit
	})).reverse();
}
async function createMessageRecord(data) {
	return api.entities.Message.create(data);
}
async function deleteMessageRecord(id) {
	return api.entities.Message.delete(id);
}
function subscribeMessages(channelId, callback) {
	return api.entities.Message.subscribe((event) => {
		if (event?.data?.channel_id === channelId) callback(event);
	});
}
async function latestMessages(limit = 40) {
	return items(await api.entities.Message.list({
		sort: "-created_date",
		limit
	}));
}
async function listNotifications(userId) {
	return items(await api.entities.Notification.filter({ user_id: userId }, {
		sort: "-created_date",
		limit: 60
	}));
}
async function unreadNotificationCount(userId) {
	return api.entities.Notification.count({
		user_id: userId,
		read: false
	});
}
async function markNotificationRead(id) {
	return api.entities.Notification.update(id, { read: true });
}
async function markAllNotificationsRead(userId) {
	return api.entities.Notification.updateMany({
		user_id: userId,
		read: false
	}, { $set: { read: true } });
}
async function deleteNotificationRecord(id) {
	return api.entities.Notification.delete(id);
}
// src/lib/krypt.js
var PALETTE = [
	"hsl(145 100% 55%)",
	"hsl(321 100% 65%)",
	"hsl(211 100% 67%)",
	"hsl(47 100% 62%)",
	"hsl(265 90% 70%)",
	"hsl(174 85% 55%)"
];
function initials(name) {
	const clean = String(name || "?").replace(/^@/, "").trim();
	if (!clean) return "?";
	const parts = clean.split(/[\s._-]+/).filter(Boolean);
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[1][0]).toUpperCase();
}
function handleColor(name) {
	let hash = 0;
	const text = String(name || "krypt");
	for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) % 9973;
	return PALETTE[hash % PALETTE.length];
}
function slugify(text) {
	const map = {
		ç: "c",
		ğ: "g",
		ı: "i",
		ö: "o",
		ş: "s",
		ü: "u",
		İ: "i"
	};
	return String(text || "").toLowerCase().replace(/[çğıöşü]/g, (ch) => map[ch] || ch).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}
function normalizeHandle(text) {
	return String(text || "").trim().toLowerCase().replace(/^@/, "").replace(/[^a-z0-9._-]/g, "").slice(0, 24);
}
var TIME_LABELS = {
	tr: {
		now: "şimdi",
		locale: "tr-TR",
		minutes: (n) => `${n} dk`,
		hours: (n) => `${n} sa`,
		days: (n) => `${n} gün`
	},
	en: {
		now: "now",
		locale: "en-US",
		minutes: (n) => `${n}m`,
		hours: (n) => `${n}h`,
		days: (n) => `${n}d`
	}
};
function timeAgo(value, lang = "tr") {
	if (!value) return "";
	const then = new Date(value).getTime();
	if (Number.isNaN(then)) return "";
	const labels = TIME_LABELS[lang] || TIME_LABELS.tr;
	const diff = Math.max(0, Date.now() - then);
	const minutes = Math.floor(diff / 6e4);
	if (minutes < 1) return labels.now;
	if (minutes < 60) return labels.minutes(minutes);
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return labels.hours(hours);
	const days = Math.floor(hours / 24);
	if (days < 7) return labels.days(days);
	return new Date(then).toLocaleDateString(labels.locale, {
		day: "2-digit",
		month: "short"
	});
}
function timeStamp(value, lang = "tr") {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleTimeString(lang === "en" ? "en-US" : "tr-TR", {
		hour: "2-digit",
		minute: "2-digit"
	});
}
export { listNotifications as A, kryptApi_exports as C, listCommunityChannels as D, listCommunities as E, updateProfile as F, markNotificationRead as M, subscribeMessages as N, listMessages as O, updateChannel as P, handleTaken as S, listAccessibleChannels as T, getCommunityBySlug as _, timeAgo as a, getMyVault as b, createChannelRecord as c, createProfile as d, createVault as f, getChannelBySlug as g, deleteNotificationRecord as h, slugify as i, markAllNotificationsRead as j, listMyMemberships as k, createCommunityRecord as l, deleteMessageRecord as m, initials as n, timeStamp as o, deleteChannelMember as p, normalizeHandle as r, addChannelMember as s, handleColor as t, createMessageRecord as u, getMyMembership as v, latestMessages as w, getProfileByHandle as x, getMyProfile as y };
