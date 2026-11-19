import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/api/client";

// Site adı ve duyuru yönetici panelinden gelir; giriş yapmamış ziyaretçiler de okur.
const DEFAULTS = {
  site_name: "KRYPT",
  motd: "",
  allow_registration: true,
  require_email_verification: true,
};

const SiteContext = createContext(DEFAULTS);

let cached = null;

export function SiteProvider({ children }) {
  const [site, setSite] = useState(cached || DEFAULTS);

  useEffect(() => {
    let alive = true;
    api.settings
      .get()
      .then((data) => {
        cached = { ...DEFAULTS, ...(data || {}) };
        if (alive) setSite(cached);
      })
      .catch(() => {
        /* ayarlar alınamazsa varsayılanlar kullanılır */
      });
    return () => {
      alive = false;
    };
  }, []);

  return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>;
}

export function useSite() {
  return useContext(SiteContext);
}
