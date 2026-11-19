# KRYPT — kendi sunucunda yayınlama

Bu paket, siteyi kendi sunucunda çalıştırmak için hazırdır: `dist/` derlenmiş arayüzü, `server/` Node.js API'sini, `src/` kaynak kodu ve **`node_modules/` kurulmuş çalışma zamanı paketlerini** içerir. Sunucuda `npm install` çalıştırman gerekmez; doğrudan `npm start` ile açılır.

## Gereksinimler

- **Node.js 22 veya üzeri** (`node -v` ile kontrol et; önerilen: 22 LTS / 24)
- **Linux x64** sunucu (paketteki `bcrypt` ve `better-sqlite3` yerel modülleri bu platform için derlenmiş haldedir)
- SQLite kullanacaksan ek bir şey gerekmez; MySQL/Supabase/Firebase için erişilebilir bir veritabanı

> Farklı bir platformda (ör. ARM sunucu, macOS, Windows) çalıştıracaksan `node_modules` klasörünü silip `npm ci` ile kendi platformun için yeniden kur; derleme araçları gerekir (Debian/Ubuntu: `sudo apt install -y build-essential python3`).

> `node_modules` yalnızca **çalışma zamanı** paketlerini içerir. Arayüzü yeniden derlemek (`npm run build`) veya geliştirme sunucusu (`npm run dev`) için `npm install` ile geliştirme paketlerini de kurman gerekir.

## 1) Dosyaları sunucuya çıkar

```bash
unzip krypt-selfhosted-deploy.zip
cd krypt
```

## 2) Bağımlılıklar hazır

Paketteki `node_modules/` kurulmuş haldedir; bu adımı atlayabilirsin. Yalnızca `node_modules` klasörünü silersen veya farklı bir platforma taşırsan:

```bash
npm ci --omit=dev
```

> `npm ci` yalnızca `package-lock.json` ile çalışır; sürümler kilitlidir. Kurulum betikleri (bcrypt/better-sqlite3) onay isterse `npm ci --foreground-scripts` ile çalıştırıp çıktıyı izle.

## 3) Yapılandırma: `.env`

```bash
cp .env.example .env
nano .env
```

`.env` içinde **yalnızca kullanacağın veritabanının** satırlarını doldur:

| Tür | Gerekli satırlar |
|---|---|
| SQLite (varsayılan) | `DB_BACKEND=sqlite` ve `DATABASE_URL=sqlite:///./data/krypt.db` |
| MySQL / MariaDB | `DB_BACKEND=mysql`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` |
| Supabase | `DB_BACKEND=supabase`, `DATABASE_URL=postgresql://...`, `DB_SSL=true` |
| Firebase RTDB | `DB_BACKEND=firebase`, `FIREBASE_DATABASE_URL`, `FIREBASE_CREDENTIALS` |

Ek olarak üretimde şunları ayarla:

```env
PORT=8000
APP_URL=https://alanadin.com
JWT_SECRET=uzun-rastgele-bir-anahtar   # openssl rand -base64 48
ALLOW_REGISTRATION=true                # yeni kayıtları kapatmak için false
REQUIRE_EMAIL_VERIFICATION=true        # kayıtta e-posta doğrulaması (panelden de yönetilir)
```

Parola sıfırlama ve e-posta doğrulama postaları için `SMTP_*` alanlarını doldur. `SMTP_HOST` boşsa her iki bağlantı da sunucu konsoluna yazılır; doğrulamayı panelden elle de yapabilirsin.

**Posta gitmiyorsa:** Yönetim paneli → Ayarlar sekmesindeki "e-posta gönderimi" kartı SMTP'nin tanımlı olup olmadığını ve son gönderim denemelerini (hata mesajıyla) gösterir. Üyeler sekmesinde doğrulanmamış bir üyenin yanındaki **bağlantı** düğmesi 48 saat geçerli doğrulama bağlantısını panoya kopyalar (posta göndermez); **doğrula** düğmesi ise hesabı elle doğrular. Kayıt ekranı da posta gönderilemediğinde bunu açıkça uyarır.

### Yerelde posta denemesi: Mailpit

Gerçek e-posta göndermeden doğrulama/sıfırlama akışını denemek için paketteki Compose dosyası Mailpit'i ayağa kaldırır (Docker gerekir):

```bash
docker compose up -d
```

- SMTP: `127.0.0.1:1025` (kimlik doğrulaması ve TLS yok)
- Gelen kutusu: <http://localhost:8025>

`.env` dosyasında şu satırları açıp sunucuyu yeniden başlat:

```env
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_FROM=krypt@localhost
```

Artık tüm postalar Mailpit'in web arayüzünde görünür. Üretimde Mailpit kullanma; gerçek bir SMTP relay'i (ör. kendi alan adının sağlayıcısı) tanımla.

## 3.5) Yönetici hesabı: `admin.json`

Yönetici **ilk kayıt olan üye değildir**. Proje kökündeki `admin.json` dosyasında yazan e-posta ve parola ile giriş yapan hesap yönetici sayılır:

```json
{
  "email": "admin@krypt.local",
  "password": "KRYPT-admin-2026"
}
```

- Paketi ilk kurduğunda bu değerleri **mutlaka değiştir** (en az 8 karakterlik parola).
- Sunucu her açılışta dosyayı okur: hesap yoksa oluşturur, varsa parolasını dosyadaki değere çeker ve rolünü `admin` yapar.
- Yönetici erişimini kaybettiysen dosyaya yeni e-posta/parola yazıp `sudo systemctl restart krypt` yeterlidir.
- `admin.json` dosyasını herkese açık bir yere koyma; `ADMIN_FILE` ile başka bir yol da gösterebilirsin.
- Kayıt olan diğer herkes normal üyedir. Yönetici yetkisi panelden verilip alınabilir.

### Admin paneli (`/admin`)

Yönetici hesapla giriş yaptıktan sonra sol menüdeki **Yönetim** bağlantısından açılır:

- **Genel bakış:** üye, yönetici, kanal, topluluk, mesaj sayıları; yönetici dosyasının yolu.
- **Üyeler:** tüm üyelerin e-postası, görünen adı, kullanıcı adı, kayıt tarihi, rolü ve moderasyon durumu. “admin yap / yetkiyi al” ile panele erişen kişileri ekleyip çıkarabilirsin. Son yönetici kaldırılamaz.
  - **Banla:** kullanıcı giriş yapamaz, mevcut oturumu da anında kapanır. Süre seçilebilir (süresiz / 1 saat / 24 saat / 7 gün / 30 gün) ve neden yazılabilir.
  - **Sustur:** kullanıcı okumaya devam eder ama mesaj, kanal ve topluluk oluşturamaz. Süre ve neden aynı şekilde verilir.
  - **Doğrula:** e-posta doğrulaması açıkken üyeyi elle doğrulanmış sayar.
- **Davetler:** davet kodu üret. Her kodun kullanım sınırı (0 = sınırsız) ve geçerlilik süresi (0 = süresiz) vardır; kodlar kopyalanabilir, kapatılabilir veya silinebilir.
- **Şikayetler:** kullanıcıların mesaj bildirimleri burada listelenir. Şikayet “çöz” veya “yoksay” ile kapatılır.
- **Veritabanı:** tüm veriyi tek JSON dosyası olarak indir; indirdiğin yedeği *birleştir* veya *değiştir* modunda geri yükle. Yedek parola özetlerini içerir, güvenli sakla.
- **Ayarlar:** site adı (kenar çubuğu logosunda görünür), duyuru metni (her sayfanın üstünde şerit olarak görünür), **kayıt yöntemi** ve **captcha türü**, yeni üye kaydı, e-posta doğrulaması, topluluk ve kanal oluşturma izinleri.

> Yedek dosyası 32 MB'a kadar yüklenebilir. “Değiştir” modu önce tüm kayıtları siler; içinde en az bir yönetici hesabı olmayan yedek reddedilir.

## 3.6) Kayıt ve doğrulama yöntemleri

`.env` içindeki `REGISTRATION_METHOD` varsayılan yöntemi belirler; **panel → Ayarlar → kayıt yöntemi** seçimi bunu geçersiz kılar (`.env` varsayılanı seçili kalabilir).

| Yöntem | Kayıt ekranı | Doğrulama |
|---|---|---|
| `email` | e-posta + parola | e-postadaki bağlantı (`REQUIRE_EMAIL_VERIFICATION`) |
| `invite` | kullanıcı adı + parola + **davet kodu** | kodun süresi/kullanım sınırı |
| `captcha` | kullanıcı adı + parola + **captcha** | yazı doğru yazılınca hesap açılır |
| `telegram` | kullanıcı adı + parola | bottan `/start KOD` |
| `open` | kullanıcı adı + parola | yok |

`email` dışındaki yöntemlerde e-posta istenmez; üye **kullanıcı adı** ile giriş yapar (giriş alanı e-postayı da kabul eder). Telegram dışındaki yöntemlerde hesap kayıt anında doğrulanmış sayılır.

### Davet kodu

1. Panel → **Davetler** → kullanım sınırı ve süre gir → **üret**.
2. Kodu kopyalayıp iletttiğin kişi, kayıt ekranında kullanıcı adı + parola ile birlikte girer.
3. Süresi dolmuş, kullanım sınırı dolmuş veya kapatılmış kodlar reddedilir; reddin nedeni kayıt ekranında yazar.

Kodlar veritabanında saklanır (düz metin) ve panelden her zaman kopyalanabilir.

### Kendi captcha'mız (`CAPTCHA_PROVIDER=local`)

Sunucu rastgele iki kelime + sayı üretir (“gece mavi 42”), kullanıcı bunu kutucuğa aynen yazar. Her yazı tek kullanımlıktır ve 5 dakika geçerlidir; yanlış cevap yazıyı yakar. Panelden “kendi captcha'mız” seçildiğinde kayıt formunda otomatik görünür. `REGISTRATION_METHOD=captcha` seçiliyken sağlayıcı `none` olsa bile yerel captcha uygulanır.

### Cloudflare Turnstile (`CAPTCHA_PROVIDER=turnstile`)

1. Cloudflare panosu → **Turnstile** → *Add site*; alan adını yaz.
2. `.env` içine site key ve secret key'i koy, `CAPTCHA_PROVIDER=turnstile` yap.
3. Sunucuyu yeniden başlat.

> **Fail-closed:** `CAPTCHA_PROVIDER=turnstile` (veya panelde Turnstile) seçiliyken anahtarlardan biri eksikse captcha sessizce kapanmaz. Kayıt istekleri `503 captcha_unconfigured` ile reddedilir, panel/kayıt ekranı nedeni gösterir; anahtarları ekleyip sunucuyu yeniden başlatana kadar yeni kayıt alınmaz. Sunucu açılışta da konsola uyarı yazar.

### Telegram botu (`REGISTRATION_METHOD=telegram`)

1. Telegram'da **@BotFather** → `/newbot` → token al.
2. `.env`:

```env
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_BOT_USERNAME=botun_adi        # @ olmadan
```

3. Sunucuyu yeniden başlat. Token varsa bot güncellemeleri uzun yoklamayla dinlenir; ek ayar gerekmez. Webhook tercih edersen `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://alanadin.com/api/telegram/webhook&secret_token=...` ile bağla ve aynı değeri `TELEGRAM_WEBHOOK_SECRET` olarak yaz.
4. Kayıt olan kişi kullanıcı adı + parola girer; ekranda `/start KOD` komutu ve bot bağlantısı çıkar. Kodu bota gönderince hesap doğrulanır, tarayıcı birkaç saniye içinde oturum açar.
5. Kodun süresi dolarsa (30 dakika) veya sayfa kapanırsa aynı kullanıcı adı kilitli kalmaz: kayıt ekranındaki **Yeni kod al** düğmesi parolayı doğrulayıp aynı hesap için taze kod üretir. Önceki bekleyen kodlar geçersiz olur. Bu istek `POST /api/auth/telegram/resend` ucunu kullanır (5 deneme / 5 dakika sınırı).

> Telegram tokeni bir sırdır: `.env` dosyasını paylaşma, `TELEGRAM_BOT_TOKEN` boşsa yöntem kayıt ekranında "bot ayarlı değil" hatası verir.

## 4) Çalıştır

```bash
npm start
```

- Arayüz: `http://SUNUCU_IP:8000`
- Sağlık kontrolü: `http://SUNUCU_IP:8000/api/health` → seçilen veritabanını ve hedefi gösterir.

İlk açılışta yönetici, `admin.json` dosyasındaki hesapla oluşturulur (ilk kayıt olan üye yönetici değildir). Kayıtları kapatmak için `.env` içinde `ALLOW_REGISTRATION=false` yapıp yeniden başlat ya da panelden kapat.

## 5) Kalıcı servis (systemd)

`/etc/systemd/system/krypt.service`:

```ini
[Unit]
Description=KRYPT
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/krypt
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now krypt
sudo journalctl -u krypt -f
```

`pm2` de kullanabilirsin: `pm2 start server/index.js --name krypt && pm2 save`.

## 6) Nginx + WebSocket + HTTPS

WebSocket (`/api/ws`) için upgrade başlıkları gerekir:

```nginx
server {
  listen 80;
  server_name alanadin.com;

  location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600s;
  }
}
```

Sonra `sudo certbot --nginx -d alanadin.com` ile HTTPS al. `.env` içindeki `APP_URL` ve `CORS_ORIGINS` değerlerini gerçek alan adına göre güncelle.

## Güncelleme

Yeni paketi aynı dizine çıkar (`.env` ve `server/data/` korunur), sonra:

```bash
sudo systemctl restart krypt
```

Yeni sürümde `package.json` değiştiyse `npm ci --omit=dev` çalıştır.

## Notlar

- `dist/` yeniden derlemek istersen: `npm run build` (kaynak `src/` pakette mevcut).
- Veritabanı yedeği: SQLite için `server/data/krypt.db` (+ `.jwt_secret`) dosyasını kopyala.
- `server/data/` ve `.env` pakete **dahil değildir**; gizli anahtarlar sunucuda üretilir.
- Firebase kullanacaksan servis hesabı JSON'unu sunucuya koy ve `FIREBASE_CREDENTIALS` ile yolunu göster; dosyayı herkese açık bir dizine koyma.
