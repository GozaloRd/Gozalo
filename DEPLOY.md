# Despliegue de Gozalo en produccion

Arquitectura recomendada (gratis):

```
   +--------------+        +-----------------+        +-------------------+
   |   Vercel     | -----> |  Render (Node)  | -----> |  Supabase (DB)    |
   |  (Next.js)   |  HTTPS |  Express API    |  SSL   |  PostgreSQL       |
   +--------------+        +-----------------+        +-------------------+
                              | disco 1 GB
                              v
                          backend/uploads
```

Tiempo total: ~30 minutos. Sin tarjeta de credito.

---

## 1. Crear la base de datos en Supabase

1. Entra en https://supabase.com y haz **New project**.
2. Rellena:
   - **Name**: `gozalo`
   - **Database password**: genera una fuerte y **guardala** (la usaras una sola vez).
   - **Region**: la mas cercana a tu publico (ej. `East US (North Virginia)`).
   - **Plan**: Free.
3. Espera ~2 min a que aprovisione.
4. Ve a **Project Settings -> Database -> Connection string -> URI**.
5. Selecciona la pestana **"Transaction"** o **"Session"** (pooler). Copia la cadena, que se parece a:

   ```
   postgresql://postgres.xxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

   Reemplaza `[YOUR-PASSWORD]` por la contrasena que generaste. Esa es tu `DATABASE_URL`.

> **No** uses la conexion directa al puerto 5432: agota IPs publicas. El pooler (6543) es lo correcto para Render Free.

---

## 2. Desplegar el backend en Render

1. Entra en https://render.com con tu cuenta de GitHub.
2. **New -> Blueprint**.
3. Conecta el repo `GozaloRd/Gozalo`. Render leera `render.yaml` automaticamente.
4. Te pedira rellenar las variables marcadas como `sync: false`:
   - `DATABASE_URL` -> la cadena de Supabase del paso anterior.
   - `FRONTEND_URL` -> deja `http://localhost:3000` por ahora, lo cambiamos al final.
   - `RESEND_API_KEY`, `EMAIL_FROM` -> opcional (solo si vas a enviar emails ya).
   - `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` -> opcional ahora; los rellenamos despues.
5. Pulsa **Apply**. Render:
   - Crea el web service `gozalo-api`.
   - Adjunta un disco persistente de 1 GB para `uploads/`.
   - Genera automaticamente `JWT_SECRET`.
   - Empieza el build (`npm install`) y el start (`npm start`).
6. Espera al primer deploy (~5 min). En **Logs** veras:

   ```
   [DB] Usando DATABASE_URL
   [DB] sync({ alter: true }) aplicado - esquema alineado con los modelos
   Gozalo API http://localhost:4000
   ```

7. Copia la URL publica del servicio, algo como `https://gozalo-api.onrender.com`. **Pruebala**: abre `https://gozalo-api.onrender.com/health` y deberias ver `{"ok":true,"service":"gozalo-api",...}`.

8. **Importante (tras el primer deploy exitoso)**: en Render -> Environment, cambia `DB_SYNC_ALTER` de `1` a `0`. Esto evita que Sequelize altere el esquema en futuros deploys.

### Crear el primer admin

En Render, ve al servicio `gozalo-api` -> **Shell**:

```bash
SEED_ADMIN_EMAIL=tucorreo@dominio.com SEED_ADMIN_PASSWORD=tuClaveSegura SEED_ADMIN_NAME="Tu Nombre" npm run seed:admin
```

Veras `Usuario admin creado: tucorreo@dominio.com`. Con ese correo inicias sesion en /login.

---

## 3. Desplegar el frontend en Vercel

1. Entra en https://vercel.com/new y importa el repo `GozaloRd/Gozalo`.
2. Configura el proyecto:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `frontend` (haz clic en *Edit* y escribelo)
   - **Build Command**: default (`next build`)
   - **Output Directory**: default (`.next`)
3. En **Environment Variables** anade:

   ```
   NEXT_PUBLIC_API_URL = https://gozalo-api.onrender.com
   ```

   (sin `/` al final, con tu URL real de Render). Marca las 3 cajas: Production, Preview, Development.

4. Pulsa **Deploy**. Tras ~4 min tendras una URL `https://gozalo-xxxxx.vercel.app`.

---

## 4. Cerrar el circulo: avisar al backend del dominio del frontend

Vuelve a Render -> servicio `gozalo-api` -> **Environment**:

1. Edita `FRONTEND_URL` y pon:

   ```
   https://gozalo-xxxxx.vercel.app
   ```

   (o varios separados por coma si tienes dominio propio:
   `https://gozalo.com,https://www.gozalo.com,https://gozalo-xxxxx.vercel.app`).

2. `FRONTEND_URL_REGEX` ya viene con `^https://.*\.vercel\.app$` para permitir todos los previews de Vercel.

3. Guarda. Render redespliega solo (~30 seg).

---

## 5. Verificacion

1. Entra a `https://gozalo-xxxxx.vercel.app`.
2. Prueba **/login** con el admin que creaste.
3. Crea un evento de prueba.
4. Sube una imagen: comprueba que la URL devuelta es `https://gozalo-api.onrender.com/uploads/xxxxx.jpg` y se ve.

---

## Costes y limitaciones del plan gratis

| Servicio | Limite gratis | Que pasa al excederlo |
|---|---|---|
| Vercel (Hobby) | 100 GB ancho/mes | Sigue sirviendo pero degradado |
| Render (Free) | 750 h/mes (suficiente) + se duerme tras 15 min de inactividad | Primera peticion tras dormir tarda ~30 seg ("cold start"). Soluciones: 1) UptimeRobot pingueando /health cada 5 min, 2) plan Starter $7/mes |
| Supabase (Free) | 500 MB DB + 1 GB Storage + se pausa tras 1 semana sin actividad | Reactivable con 1 clic |

Para evitar el cold start de Render gratis, configura https://uptimerobot.com pingueando `https://gozalo-api.onrender.com/health` cada 5 minutos.

---

## Migracion futura de uploads a Supabase Storage (opcional)

Cuando el disco de 1 GB de Render se quede corto, mueve uploads a Supabase Storage:

1. En Supabase -> Storage -> New bucket -> `uploads` (Public).
2. Reescribir `backend/src/middleware/upload.js` para usar `@supabase/supabase-js` en vez de `multer.diskStorage`.
3. El `next.config.mjs` del frontend ya admite hostnames de Supabase si los anades a `remotePatterns`.

No es necesario ahora; el disco de 1 GB aguanta miles de fotos.

---

## Resumen de variables

### Backend (Render)
- `NODE_ENV=production`
- `PORT=4000`
- `DATABASE_URL=...supabase pooler...`
- `DB_SSL=true`
- `DB_SYNC_ALTER=0` (1 solo en el primer deploy)
- `JWT_SECRET=...auto-generado...`
- `FRONTEND_URL=https://tu-app.vercel.app`
- `FRONTEND_URL_REGEX=^https://.*\.vercel\.app$`
- `RESEND_API_KEY` (opcional)
- `EMAIL_FROM` (opcional)

### Frontend (Vercel)
- `NEXT_PUBLIC_API_URL=https://gozalo-api.onrender.com`
