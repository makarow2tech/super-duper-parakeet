import { api } from "@/api/client";

// Kanal üyelerine bildirim dağıtır. Mesaj içeriği taşımaz (uçtan uca şifreleme korunur).
export const notifyMembers = ({ data }) => api.notify(data);
