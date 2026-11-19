import { api } from "@/api/client";

const items = (page) => page?.items ?? [];

// ---------------------------------------------------------------------------
// Profil
// ---------------------------------------------------------------------------

export async function getMyProfile(userId) {
  const page = await api.entities.Profile.filter({ user_id: userId }, { limit: 1 });
  return items(page)[0] ?? null;
}

export async function getProfileByHandle(handle) {
  const page = await api.entities.Profile.filter({ handle: String(handle).toLowerCase() }, { limit: 1 });
  return items(page)[0] ?? null;
}

export async function handleTaken(handle) {
  const page = await api.entities.Profile.filter({ handle: String(handle).toLowerCase() }, { limit: 1 });
  return items(page).length > 0;
}

export async function createProfile(data) {
  return api.entities.Profile.create(data);
}

export async function updateProfile(id, data) {
  return api.entities.Profile.update(id, data);
}

export async function listProfiles(limit = 40) {
  return items(await api.entities.Profile.list({ sort: "-created_date", limit }));
}

// ---------------------------------------------------------------------------
// Kasa
// ---------------------------------------------------------------------------

export async function getMyVault(userId) {
  const page = await api.entities.Vault.filter({ user_id: userId }, { limit: 1 });
  return items(page)[0] ?? null;
}

export async function createVault(data) {
  return api.entities.Vault.create(data);
}

export async function updateVault(id, data) {
  return api.entities.Vault.update(id, data);
}

// ---------------------------------------------------------------------------
// Kanallar
// ---------------------------------------------------------------------------

export async function listAccessibleChannels(userId) {
  return items(
    await api.entities.Channel.filter(
      { $or: [{ visibility: "public" }, { members: userId }] },
      { sort: "-created_date", limit: 100 }
    )
  );
}

export async function getChannelBySlug(slug) {
  const page = await api.entities.Channel.filter({ slug }, { limit: 1 });
  return items(page)[0] ?? null;
}

export async function getChannelById(id) {
  try {
    return await api.entities.Channel.get(id);
  } catch {
    return null;
  }
}

export async function createChannelRecord(data) {
  return api.entities.Channel.create(data);
}

export async function updateChannel(id, data) {
  return api.entities.Channel.update(id, data);
}

export async function deleteChannelRecord(id) {
  return api.entities.Channel.delete(id);
}

export async function listMyMemberships(userId) {
  return items(await api.entities.ChannelMember.filter({ user_id: userId }, { limit: 200 }));
}

export async function getMyMembership(channelId, userId) {
  const page = await api.entities.ChannelMember.filter({ channel_id: channelId, user_id: userId }, { limit: 1 });
  return items(page)[0] ?? null;
}

export async function listChannelMembers(channelId) {
  return items(await api.entities.ChannelMember.filter({ channel_id: channelId }, { limit: 200 }));
}

export async function addChannelMember(data) {
  return api.entities.ChannelMember.create(data);
}

export async function deleteChannelMember(id) {
  return api.entities.ChannelMember.delete(id);
}

// ---------------------------------------------------------------------------
// Topluluklar
// ---------------------------------------------------------------------------

export async function listCommunities(limit = 100) {
  return items(await api.entities.Community.list({ sort: "-created_date", limit }));
}

export async function getCommunityBySlug(slug) {
  const page = await api.entities.Community.filter({ slug }, { limit: 1 });
  return items(page)[0] ?? null;
}

export async function createCommunityRecord(data) {
  return api.entities.Community.create(data);
}

export async function listCommunityChannels(communityId, limit = 100) {
  return items(
    await api.entities.Channel.filter({ community_id: communityId }, { sort: "-created_date", limit })
  );
}

// ---------------------------------------------------------------------------
// Mesajlar
// ---------------------------------------------------------------------------

export async function listMessages(channelId, limit = 60) {
  const page = await api.entities.Message.filter({ channel_id: channelId }, { sort: "-created_date", limit });
  return items(page).reverse();
}

export async function createMessageRecord(data) {
  return api.entities.Message.create(data);
}

export async function deleteMessageRecord(id) {
  return api.entities.Message.delete(id);
}

export function subscribeMessages(channelId, callback) {
  return api.entities.Message.subscribe((event) => {
    if (event?.data?.channel_id === channelId) callback(event);
  });
}

export async function latestMessages(limit = 40) {
  return items(await api.entities.Message.list({ sort: "-created_date", limit }));
}

// ---------------------------------------------------------------------------
// Bildirimler
// ---------------------------------------------------------------------------

export async function listNotifications(userId) {
  return items(
    await api.entities.Notification.filter({ user_id: userId }, { sort: "-created_date", limit: 60 })
  );
}

export async function unreadNotificationCount(userId) {
  return api.entities.Notification.count({ user_id: userId, read: false });
}

export async function markNotificationRead(id) {
  return api.entities.Notification.update(id, { read: true });
}

export async function markAllNotificationsRead(userId) {
  return api.entities.Notification.updateMany({ user_id: userId, read: false }, { $set: { read: true } });
}

export async function deleteNotificationRecord(id) {
  return api.entities.Notification.delete(id);
}