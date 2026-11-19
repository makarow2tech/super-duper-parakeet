import { l as useAuth } from "./router-CRnjuvSx.js";
import { b as getMyVault, d as createProfile, f as createVault, v as getMyMembership, y as getMyProfile } from "./krypt-ELaGncLW.js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { jsx } from "react/jsx-runtime";
// src/lib/crypto.js
var enc = new TextEncoder();
var dec = new TextDecoder();
function toB64(buf) {
	const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
	let out = "";
	const chunk = 32768;
	for (let i = 0; i < bytes.length; i += chunk) out += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
	return btoa(out);
}
function fromB64(str) {
	return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}
function randomBytes(n) {
	return crypto.getRandomValues(new Uint8Array(n));
}
var RSA = {
	name: "RSA-OAEP",
	hash: "SHA-256"
};
var RSA_GEN = {
	name: "RSA-OAEP",
	modulusLength: 4096,
	publicExponent: new Uint8Array([
		1,
		0,
		1
	]),
	hash: "SHA-256"
};
var KDF_ITERATIONS = 31e4;
async function importAesKey(rawKeyB64) {
	return crypto.subtle.importKey("raw", fromB64(rawKeyB64), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
async function createIdentity() {
	const pair = await crypto.subtle.generateKey(RSA_GEN, true, ["encrypt", "decrypt"]);
	return {
		publicJwk: await crypto.subtle.exportKey("jwk", pair.publicKey),
		privateJwk: await crypto.subtle.exportKey("jwk", pair.privateKey)
	};
}
async function fingerprint(publicJwk) {
	const jwk = typeof publicJwk === "string" ? JSON.parse(publicJwk) : publicJwk;
	const material = `${jwk.n || ""}.${jwk.e || ""}`;
	const digest = await crypto.subtle.digest("SHA-256", enc.encode(material));
	return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32).match(/.{1,4}/g).join(" ").toUpperCase();
}
async function deriveWrappingKey(passphrase, salt) {
	const base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
	return crypto.subtle.deriveKey({
		name: "PBKDF2",
		salt,
		iterations: KDF_ITERATIONS,
		hash: "SHA-256"
	}, base, {
		name: "AES-GCM",
		length: 256
	}, false, ["encrypt", "decrypt"]);
}
async function sealPrivateKey(privateJwk, passphrase) {
	const salt = randomBytes(16);
	const iv = randomBytes(12);
	const wrapKey = await deriveWrappingKey(passphrase, salt);
	const ct = await crypto.subtle.encrypt({
		name: "AES-GCM",
		iv
	}, wrapKey, enc.encode(JSON.stringify(privateJwk)));
	return JSON.stringify({
		v: 1,
		kdf: "PBKDF2-SHA256",
		iterations: KDF_ITERATIONS,
		salt: toB64(salt),
		iv: toB64(iv),
		ct: toB64(ct)
	});
}
async function openPrivateKey(vaultBlob, passphrase) {
	const blob = typeof vaultBlob === "string" ? JSON.parse(vaultBlob) : vaultBlob;
	const wrapKey = await deriveWrappingKey(passphrase, fromB64(blob.salt));
	try {
		const plain = await crypto.subtle.decrypt({
			name: "AES-GCM",
			iv: fromB64(blob.iv)
		}, wrapKey, fromB64(blob.ct));
		return JSON.parse(dec.decode(plain));
	} catch {
		const error = /* @__PURE__ */ new Error("Kasa parolası hatalı.");
		error.code = "BAD_PASSPHRASE";
		throw error;
	}
}
function newChannelKey() {
	return toB64(randomBytes(32));
}
async function wrapChannelKey(keyB64, publicJwk) {
	const jwk = typeof publicJwk === "string" ? JSON.parse(publicJwk) : publicJwk;
	const pub = await crypto.subtle.importKey("jwk", jwk, RSA, false, ["encrypt"]);
	return toB64(await crypto.subtle.encrypt(RSA, pub, fromB64(keyB64)));
}
async function unwrapChannelKey(wrappedB64, privateJwk) {
	const jwk = typeof privateJwk === "string" ? JSON.parse(privateJwk) : privateJwk;
	const priv = await crypto.subtle.importKey("jwk", jwk, RSA, false, ["decrypt"]);
	const raw = await crypto.subtle.decrypt(RSA, priv, fromB64(wrappedB64));
	return toB64(new Uint8Array(raw));
}
var publicKeyCache = /* @__PURE__ */ new Map();
function publicChannelKey(channelId) {
	if (!publicKeyCache.has(channelId)) publicKeyCache.set(channelId, (async () => {
		const base = await crypto.subtle.importKey("raw", enc.encode("krypt.public.v1"), "PBKDF2", false, ["deriveKey"]);
		const key = await crypto.subtle.deriveKey({
			name: "PBKDF2",
			salt: enc.encode(`channel:${channelId}`),
			iterations: 12e4,
			hash: "SHA-256"
		}, base, {
			name: "AES-GCM",
			length: 256
		}, true, ["encrypt", "decrypt"]);
		return toB64(await crypto.subtle.exportKey("raw", key));
	})());
	return publicKeyCache.get(channelId);
}
async function encryptMessage(text, keyB64) {
	const key = await importAesKey(keyB64);
	const iv = randomBytes(12);
	const ct = await crypto.subtle.encrypt({
		name: "AES-GCM",
		iv
	}, key, enc.encode(text));
	return JSON.stringify({
		v: 1,
		alg: "AES-256-GCM",
		iv: toB64(iv),
		ct: toB64(ct)
	});
}
async function decryptMessage(cipherJson, keyB64) {
	if (!cipherJson || !keyB64) return "";
	try {
		const payload = typeof cipherJson === "string" ? JSON.parse(cipherJson) : cipherJson;
		const key = await importAesKey(keyB64);
		const plain = await crypto.subtle.decrypt({
			name: "AES-GCM",
			iv: fromB64(payload.iv)
		}, key, fromB64(payload.ct));
		return dec.decode(plain);
	} catch {
		return "";
	}
}
// src/lib/vault.js
var listeners = /* @__PURE__ */ new Set();
function sessionKey(userId) {
	return `krypt.vault.${userId}`;
}
function getSessionPrivateKey(userId) {
	if (typeof window === "undefined" || !userId) return null;
	try {
		const raw = window.sessionStorage.getItem(sessionKey(userId));
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}
function setSessionPrivateKey(userId, privateKeyJwk) {
	if (typeof window === "undefined" || !userId) return;
	try {
		window.sessionStorage.setItem(sessionKey(userId), JSON.stringify(privateKeyJwk));
	} catch {}
	listeners.forEach((fn) => fn());
}
function lockVault(userId) {
	if (typeof window === "undefined" || !userId) return;
	window.sessionStorage.removeItem(sessionKey(userId));
	listeners.forEach((fn) => fn());
}
function subscribeVault(callback) {
	listeners.add(callback);
	return () => listeners.delete(callback);
}
// src/lib/VaultContext.jsx
var VaultContext = createContext(null);
function VaultProvider({ children }) {
	const { user } = useAuth();
	const [loading, setLoading] = useState(true);
	const [profile, setProfile] = useState(null);
	const [vault, setVault] = useState(null);
	const [privateKey, setPrivateKey] = useState(null);
	const keyCache = useRef(/* @__PURE__ */ new Map());
	const load = useCallback(async () => {
		if (!user?.id) return;
		setLoading(true);
		try {
			const [nextProfile, nextVault] = await Promise.all([getMyProfile(user.id), getMyVault(user.id)]);
			setProfile(nextProfile);
			setVault(nextVault);
			setPrivateKey(getSessionPrivateKey(user.id));
		} finally {
			setLoading(false);
		}
	}, [user?.id]);
	useEffect(() => {
		load();
	}, [load]);
	useEffect(() => subscribeVault(() => setPrivateKey(getSessionPrivateKey(user?.id))), [user?.id]);
	const setup = useCallback(async ({ handle, displayName, passphrase }) => {
		const { publicJwk, privateJwk } = await createIdentity();
		const fp = await fingerprint(publicJwk);
		const blob = await sealPrivateKey(privateJwk, passphrase);
		const nextProfile = await createProfile({
			user_id: user.id,
			handle,
			display_name: displayName || handle,
			public_key: JSON.stringify(publicJwk)
		});
		const nextVault = await createVault({
			user_id: user.id,
			vault_blob: blob,
			fingerprint: fp
		});
		setProfile(nextProfile);
		setVault(nextVault);
		setSessionPrivateKey(user.id, privateJwk);
		setPrivateKey(privateJwk);
		return {
			profile: nextProfile,
			fingerprint: fp
		};
	}, [user?.id]);
	const unlock = useCallback(async (passphrase) => {
		if (!vault) throw new Error("Kasa bulunamadı.");
		const priv = await openPrivateKey(vault.vault_blob, passphrase);
		setSessionPrivateKey(user.id, priv);
		setPrivateKey(priv);
		return true;
	}, [vault, user?.id]);
	const lock = useCallback(() => {
		keyCache.current.clear();
		lockVault(user?.id);
		setPrivateKey(null);
	}, [user?.id]);
	const channelKey = useCallback(async (channel, membership = null) => {
		if (!channel?.id) return null;
		if (channel.visibility === "public") return publicChannelKey(channel.id);
		if (keyCache.current.has(channel.id)) return keyCache.current.get(channel.id);
		if (!privateKey) return null;
		let wrapped = membership?.wrapped_key;
		if (!wrapped) wrapped = (await getMyMembership(channel.id, user.id))?.wrapped_key;
		if (!wrapped) return null;
		const key = await unwrapChannelKey(wrapped, privateKey);
		keyCache.current.set(channel.id, key);
		return key;
	}, [privateKey, user?.id]);
	const value = useMemo(() => ({
		loading,
		profile,
		vault,
		privateKey,
		hasVault: Boolean(vault),
		needsSetup: !loading && !vault,
		locked: !loading && Boolean(vault) && !privateKey,
		reload: load,
		setup,
		unlock,
		lock,
		channelKey,
		newKey: newChannelKey,
		wrapFor: (publicKey, keyB64) => wrapChannelKey(keyB64, publicKey)
	}), [
		loading,
		profile,
		vault,
		privateKey,
		load,
		setup,
		unlock,
		lock,
		channelKey
	]);
	return /* @__PURE__ */ jsx(VaultContext.Provider, {
		value,
		children
	});
}
function useVault() {
	const ctx = useContext(VaultContext);
	if (!ctx) throw new Error("useVault bir VaultProvider içinde kullanılmalı");
	return ctx;
}
export { encryptMessage as i, useVault as n, decryptMessage as r, VaultProvider as t };
