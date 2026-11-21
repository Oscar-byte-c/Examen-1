-- =============================================================================
-- Migración: perfiles de usuario y roles (Fase 3A)
-- ADR: Supabase Auth + RLS · cuentas administradas sin registro público
--
-- La tabla `perfiles` es la ÚNICA fuente de verdad del rol de cada usuario.
-- Nunca se usa `user_metadata` (el propio usuario puede modificarlo desde el cliente).
-- =============================================================================

create table public.perfiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  cedula             text not null unique check (cedula ~ '^[0-9]{10}$'),
  nombres            text not null check (length(trim(nombres)) > 0),
  apellidos          text not null check (length(trim(apellidos)) > 0),
  telefono           text not null check (telefono ~ '^[0-9]{9,10}$'),
  rol                text not null check (rol in ('coordinador_provincial', 'coordinador_recinto', 'veedor')),
  recinto_id         uuid null,          -- la FK a public.recintos se agrega en la fase de territorio
  creado_por         uuid null references public.perfiles (id),
  debe_cambiar_clave boolean not null default true,
  activo             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.perfiles is
  'Perfil y rol de cada usuario. Solo se crea/modifica con privilegios de servidor (Edge Functions o migraciones).';

-- -----------------------------------------------------------------------------
-- Trazabilidad: updated_at se mantiene en el servidor, no lo decide el cliente.
-- search_path vacío: evita que una función se ejecute con objetos suplantados
-- (recomendación del Security Advisor de Supabase).
-- -----------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger perfiles_set_updated_at
  before update on public.perfiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- SEGURIDAD — dos barreras independientes (defensa en profundidad)
--
-- Barrera 1: PRIVILEGIOS. Supabase concede por defecto todos los permisos de las
-- tablas de `public` a los roles `anon` y `authenticated`. Los retiramos: desde la
-- app solo se puede LEER; insertar, modificar o borrar devuelve "permission denied".
-- -----------------------------------------------------------------------------
revoke all on public.perfiles from anon, authenticated;
grant select on public.perfiles to authenticated;

-- Barrera 2: ROW LEVEL SECURITY. Aunque tenga permiso de lectura, cada usuario
-- solo ve SU propia fila. `(select auth.uid())` se evalúa una vez por consulta
-- (patrón recomendado por Supabase por rendimiento).
alter table public.perfiles enable row level security;

create policy "perfil_propio_lectura"
  on public.perfiles
  for select
  to authenticated
  using (id = (select auth.uid()));

-- No existen políticas de INSERT, UPDATE ni DELETE: ningún usuario puede crear
-- perfiles, cambiar su rol, reactivarse ni modificar sus privilegios.
-- La asignación de roles se hará solo mediante una Edge Function administrativa
-- (Fase 3B) que verifica el rol de quien la invoca.
