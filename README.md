# KRYPT — uçtan uca şifreli topluluk (tamamen Node.js)

Base44/Python bağımlılığı yok. Tamamı Node.js üzerinde çalışır:

- **Ön yüz:** React 19 + TanStack Router, Tailwind CSS 4, Vite 8 — statik SPA olarak derlenir
- **Backend:** Node.js 22+ / Express 5 — e-posta + parola girişi (JWT), erişim kuralları (RLS), WebSocket ile gerçek zamanlı mesaj
- **Veritabanı (birini seç):** **SQLite** (varsayılan) · **MySQL/MariaDB** · **Supabase** · **Firebase Realtime Database**

Mesajlar tarayıcıda AES-256-GCM ile şifrelenir; yeni kasalarda özel kanal anahtarları RSA-OAEP-4096 ile korunur. Sunucu yalnızca şifreli bloğu görür. Önceden oluşturulmuş kasalar ve RSA-2048 anahtarları mevcut veriye erişimi korumak için desteklenmeye devam eder.

## Kurulum

```bash
npm install          # bağımlılıklar
cp .env.example .env # yapılandırma dosyası (ya da: npm run setup)
npm run build        # ön yüzü derle (dist/client)
npm start            # → http://localhost:8000
```

Ayarların tamamı proje kökündeki **`.env`** dosyasındadır. Yönetici orada veritabanı türünü ve bağlantı bilgilerini yazar; sunucu açılışta dosyayı okur ve o veritabanına bağlanır. `npm run setup` sihirbazı aynı dosyayı sorularla doldurur. (Ek olarak geriye dönük uyumluluk için `server/.env` de okunur; kök `.env` önceliklidir.)

Öncelik sırası: süreç ortam değişkenleri → `./.env` → `server/.env`.

İlk kayıt olan kullanıcı **yönetici** olur. Üretimde kayıtları kapatmak için `ALLOW_REGISTRATION=false`.

### Geliştirme modu
İki terminal:

```bash
npm run api:dev      # Node API (node --watch) → :8000
npm run dev          # Vite → :5173, /api ve /api/ws isteklerini 8000'e yönlendirir
```

Tek süreçte çalıştırmak için `npm run build && npm start` yeterlidir: Express hem `/api`'yi hem derlenmiş arayüzü sunar.

## Veritabanı seçimi (`.env`)

`DB_BACKEND` satırı hangi veritabanının kullanılacağını belirler: `sqlite`, `mysql`, `supabase`, `firebase`. Aşağıdaki dört bölümden yalnızca birini aç.

| Veritabanı | Ayarlar |
|---|---|
| SQLite | `DB_BACKEND=sqlite`<br>`DATABASE_URL=sqlite:///./data/krypt.db` |
| MySQL / MariaDB | `DB_BACKEND=mysql`<br>`DB_HOST=127.0.0.1`<br>`DB_PORT=3306`<br>`DB_NAME=krypt`<br>`DB_USER=krypt`<br>`DB_PASSWORD=parola`<br>(alternatif: tek satır `DATABASE_URL=mysql://kullanici:parola@127.0.0.1:3306/krypt`) |
| Supabase | `DB_BACKEND=supabase`<br>`DATABASE_URL=postgresql://postgres.PROJEREF:PAROLA@aws-0-...pooler.supabase.com:6543/postgres` (Project Settings → Database → Connection string → URI; pooler adresi önerilir)<br>`DB_SSL=true` |
| Firebase Realtime Database | `DB_BACKEND=firebase`<br>`FIREBASE_DATABASE_URL=https://PROJE-default-rtdb.firebaseio.com`<br>`FIREBASE_CREDENTIALS=./data/firebase-service-account.json` (Console → Project settings → Service accounts → Generate new private key) |

MySQL ve Supabase için `DATABASE_URL` yerine parçalı alanlar (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) de kullanılabilir; adres otomatik kurulur, paroladaki özel karakterler kodlanır.

`FIREBASE_CREDENTIALS` bir dosya yolu ya da servis hesabı JSON'unun kendisi olabilir.

Ayar eksikse sunucu açılmaz; konsola hangi alanın eksik olduğunu Türkçe yazar. Doğru veritabanına bağlandığını `GET /api/health` ile görebilirsin:

```json
{ "ok": true, "backend": "mysql", "label": "MySQL / MariaDB", "target": "mysql://***@127.0.0.1:3306/krypt" }
```

Supabase burada yalnızca **veritabanı** olarak kullanılır (içindeki Postgres'e backend bağlanır); Supabase Auth/Realtime yerine kendi giriş ve WebSocket katmanımız çalışır. Firebase için de aynı: yalnızca depolama. RTDB'de koleksiyon okunup süzme/sıralama uygulama katmanında yapılır (RTDB sorgu desteği sınırlı).

Backend servis hesabıyla bağlandığı için **veritabanı kurallarını kapalı tut** (`".read": false, ".write": false`); tüm erişim API üzerinden olur.

SQL tarafı tek bir `records` tablosunda JSON belge tutar; filtreleme uygulama katmanında yapılır. Küçük/orta topluluklar için yeterlidir; çok yüksek mesaj hacminde tipli tablolara geçişi düşün.

### Supabase bağlantısı ve SSL
`DB_SSL=false` verirsen SSL kapatılır (yerel Postgres için). Yönetilen Supabase bağlantılarında varsayılan açıktır. `.env` şablonundan kalan farklı türdeki `DATABASE_URL` satırı yok sayılır: `DB_BACKEND` değiştirip kendi bağlantı satırlarını doldurman yeterlidir.

## Neler değişti

| Eski (Python / FastAPI) | Yeni (Node.js) |
|---|---|
| `server/app/main.py` | `server/index.js` (Express 5) |
| `server/app/store.py` | `server/store.js` (SQLite/MySQL/Supabase/Firebase) |
| `server/app/auth.py` | `server/auth.js` (jose JWT, bcrypt, nodemailer) |
| `server/app/schema.py`, `query.py` | `server/entities.js`, `server/query.js` |
| `server/app/realtime.py` (WebSocket) | `server/realtime.js` (`ws`) |
| `pydantic` doğrulama | `zod` |
| `python test_api.py` | `npm test` (`server/test.api.mjs`) |

Kaldırılanlar: MongoDB ve Firestore arka uçları (istenen dört veritabanına odaklanıldı), MFA (TOTP/SMS), Google/sosyal giriş, e-posta OTP doğrulama.
Parola sıfırlama: `SMTP_*` ayarlıysa e-posta gider; değilse bağlantı sunucu konsoluna yazılır.

## Test

```bash
npm test
```

Geçici bir SQLite dosyasıyla sunucuyu başlatır; kimlik, erişim kuralları, benzersizlik, bildirim dağıtımı, WebSocket yayını, sorgu enjeksiyonu koruması ve tek kullanımlık parola sıfırlamayı doğrular.
