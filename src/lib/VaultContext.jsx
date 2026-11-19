import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { createProfile, createVault, getMyMembership, getMyProfile, getMyVault } from "@/lib/kryptApi";
import {
  createIdentity,
  fingerprint,
  newChannelKey,
  openPrivateKey,
  publicChannelKey,
  sealPrivateKey,
  unwrapChannelKey,
  wrapChannelKey,
} from "@/lib/crypto";
import { getSessionPrivateKey, lockVault, setSessionPrivateKey, subscribeVault } from "@/lib/vault";

const VaultContext = createContext(null);

export function VaultProvider({ children }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [vault, setVault] = useState(null);
  const [privateKey, setPrivateKey] = useState(null);
  const keyCache = useRef(new Map());

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

  const setup = useCallback(
    async ({ handle, displayName, passphrase }) => {
      const { publicJwk, privateJwk } = await createIdentity();
      const fp = await fingerprint(publicJwk);
      const blob = await sealPrivateKey(privateJwk, passphrase);
      const nextProfile = await createProfile({
        user_id: user.id,
        handle,
        display_name: displayName || handle,
        public_key: JSON.stringify(publicJwk),
      });
      const nextVault = await createVault({ user_id: user.id, vault_blob: blob, fingerprint: fp });
      setProfile(nextProfile);
      setVault(nextVault);
      setSessionPrivateKey(user.id, privateJwk);
      setPrivateKey(privateJwk);
      return { profile: nextProfile, fingerprint: fp };
    },
    [user?.id]
  );

  const unlock = useCallback(
    async (passphrase) => {
      if (!vault) throw new Error("Kasa bulunamadı.");
      const priv = await openPrivateKey(vault.vault_blob, passphrase);
      setSessionPrivateKey(user.id, priv);
      setPrivateKey(priv);
      return true;
    },
    [vault, user?.id]
  );

  const lock = useCallback(() => {
    keyCache.current.clear();
    lockVault(user?.id);
    setPrivateKey(null);
  }, [user?.id]);

  // Kanal anahtarını çözer: herkese açık kanallarda kanal kimliğinden türetilir,
  // özel kanallarda üyeye özel sarılmış anahtar kasadaki özel anahtarla açılır.
  const channelKey = useCallback(
    async (channel, membership = null) => {
      if (!channel?.id) return null;
      if (channel.visibility === "public") return publicChannelKey(channel.id);
      if (keyCache.current.has(channel.id)) return keyCache.current.get(channel.id);
      if (!privateKey) return null;
      let wrapped = membership?.wrapped_key;
      if (!wrapped) {
        const row = await getMyMembership(channel.id, user.id);
        wrapped = row?.wrapped_key;
      }
      if (!wrapped) return null;
      const key = await unwrapChannelKey(wrapped, privateKey);
      keyCache.current.set(channel.id, key);
      return key;
    },
    [privateKey, user?.id]
  );

  const value = useMemo(
    () => ({
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
      wrapFor: (publicKey, keyB64) => wrapChannelKey(keyB64, publicKey),
    }),
    [loading, profile, vault, privateKey, load, setup, unlock, lock, channelKey]
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault bir VaultProvider içinde kullanılmalı");
  return ctx;
}