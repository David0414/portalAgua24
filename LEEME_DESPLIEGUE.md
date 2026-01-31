# Guía para Publicar tu App AquaCheck

¡Tu aplicación está lista! Sigue estos pasos para que funcione en internet y sincronice datos entre todos los usuarios.

## 1. Configurar la Base de Datos (Gratis)

1.  Ve a [Supabase.com](https://supabase.com) y crea una cuenta gratuita.
2.  Crea un "New Project". Ponle un nombre y una contraseña segura.
3.  Una vez creado, ve al menú izquierdo **"SQL Editor"**.
4.  Copia y pega el siguiente código SQL y dale click a **RUN**:

```sql
-- TABLA DE PERFILES DE USUARIO
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  username text,
  name text,
  role text,
  phone text,
  assigned_machine_id text
);

-- TABLA DE MAQUINAS
create table public.machines (
  id text primary key,
  location text,
  "lastMaintenance" text,
  "assignedToUserId" text
);

-- TABLA DE REPORTES
create table public.reports (
  id uuid default gen_random_uuid() primary key,
  "machineId" text references public.machines(id),
  "technicianId" text,
  "technicianName" text,
  status text default 'PENDING',
  type text,
  data jsonb,
  "adminComments" text,
  "createdAt" timestamptz default now(),
  "updatedAt" timestamptz default now()
);

-- PERMISOS PUBLICOS (Simplificado para empezar)
alter table public.profiles enable row level security;
alter table public.machines enable row level security;
alter table public.reports enable row level security;

create policy "Acceso total temporal" on public.profiles for all using (true);
create policy "Acceso total temporal maq" on public.machines for all using (true);
create policy "Acceso total temporal rep" on public.reports for all using (true);
```

## 2. Conectar la App

1.  En Supabase, ve a **Project Settings (Engrane abajo) -> API**.
2.  Copia la **Project URL** y la **anon / public Key**.
3.  En tu código, abre el archivo `services/supabaseClient.ts`.
4.  Pega esas claves donde dice `TU_URL...` y `TU_KEY...`.
5.  Cambia `export const USE_SUPABASE = false;` a `true`.

## 3. Crear Usuarios Iniciales

Como el sistema de registro público está desactivado por seguridad:
1.  En Supabase, ve a **Authentication -> Users -> Add User**.
2.  Crea al propietario: `admin@aquacheck.com` / Contraseña.
3.  Copia su `User UID` (el código largo).
4.  Ve a **Table Editor -> profiles -> Insert New Row**.
5.  Pega el UID en `id`, pon `role` como `OWNER` y llena los demás datos.

## 4. Publicar en Internet

1.  Sube este código a **GitHub**.
2.  Crea una cuenta en **Vercel.com**.
3.  Dale "Add New Project" e importa tu repositorio de GitHub.
4.  Vercel detectará que es Vite. Dale **Deploy**.
5.  ¡Listo! Te dará un link (ej. `aquacheck.vercel.app`) que puedes enviar a tus técnicos y clientes.
