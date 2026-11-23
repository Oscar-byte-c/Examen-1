-- RECUPERADA del historial remoto con `supabase migration fetch` (22/11/2026).
-- Se aplicó en Supabase en una iteración anterior al ADR grupal y no estaba en el repositorio.
-- Se conserva solo para que el historial local y el remoto coincidan; su contenido lo retira
-- 20261122110000_retirar_territorio_previo.sql. NO EDITAR.
-- =============================================================================
-- Migración: territorio (provincia → recinto → mesa) y asignaciones.
-- ADR: "Autorización: Supabase RLS por rol y ámbito (provincia → recinto → mesa)".
--
-- Ámbito de cada rol:
--   coordinador_provincial → perfiles.provincia_id  (ve sus recintos y mesas)
--   coordinador_recinto    → perfiles.recinto_id    (ve su recinto y sus mesas)
--   veedor                 → perfiles.recinto_id + mesas.veedor_id (ve SOLO sus mesas)
--
-- Reglas de seguridad (revisión de seguridad previa a aplicar):
--   - Una cuenta inactiva o que AÚN no cambió su clave temporal no ve nada del territorio.
--   - `perfiles` sigue con "solo mi fila". El equipo a cargo se obtiene con `mi_equipo()`,
--     que devuelve SOLO columnas no sensibles (RLS filtra filas, no columnas: una política
--     de lectura sobre perfiles expondría cédula y teléfono).
--   - La app solo LEE. La única escritura (asignar mesa) es una función que verifica rol,
--     ámbito, estado y concurrencia, y deja historial (sin sobrescrituras silenciosas).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tablas
-- -----------------------------------------------------------------------------
create table public.provincias (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique check (length(trim(nombre)) > 0),
  created_at timestamptz not null default now()
);
create table public.recintos (
  id           uuid primary key default gen_random_uuid(),
  provincia_id uuid not null references public.provincias (id) on delete restrict,
  nombre       text not null check (length(trim(nombre)) > 0),
  direccion    text null,
  -- Coordenadas del recinto: base de la alerta de 500 m al registrar un acta (acuerdo 2.2).
  latitud      double precision not null check (latitud between -90 and 90),
  longitud     double precision not null check (longitud between -180 and 180),
  created_at   timestamptz not null default now(),
  unique (provincia_id, nombre)
);
create table public.mesas (
  id            uuid primary key default gen_random_uuid(),
  recinto_id    uuid not null references public.recintos (id) on delete restrict,
  numero        integer not null check (numero > 0),
  -- restrict: los perfiles se DESACTIVAN, no se borran (se conserva quién cuidó cada mesa).
  veedor_id     uuid null references public.perfiles (id) on delete restrict,
  asignado_por  uuid null references public.perfiles (id) on delete restrict,
  asignado_en   timestamptz null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (recinto_id, numero)
);
-- Historial de asignaciones (trazabilidad). Solo lo escribe la función de asignación.
create table public.mesas_asignaciones_historial (
  id              bigint generated always as identity primary key,
  mesa_id         uuid not null references public.mesas (id) on delete restrict,
  veedor_anterior uuid null references public.perfiles (id) on delete restrict,
  veedor_nuevo    uuid null references public.perfiles (id) on delete restrict,
  realizado_por   uuid not null references public.perfiles (id) on delete restrict,
  realizado_en    timestamptz not null default now()
);
create index mesas_veedor_idx on public.mesas (veedor_id);
create index recintos_provincia_idx on public.recintos (provincia_id);
create index historial_mesa_idx on public.mesas_asignaciones_historial (mesa_id);
create trigger mesas_set_updated_at
  before update on public.mesas
  for each row execute function public.set_updated_at();
-- Ámbito en perfiles: el provincial tiene provincia; recinto y veedor tienen recinto.
alter table public.perfiles
  add column provincia_id uuid null references public.provincias (id) on delete restrict;
alter table public.perfiles
  add constraint perfiles_recinto_fk foreign key (recinto_id) references public.recintos (id) on delete restrict;
alter table public.perfiles
  add constraint perfiles_ambito_por_rol check (
    (rol = 'coordinador_provincial' and recinto_id is null)
    or (rol in ('coordinador_recinto', 'veedor') and provincia_id is null)
  );
-- Ámbito OBLIGATORIO para filas nuevas o modificadas (NOT VALID: no rompe los perfiles que
-- existen sin ámbito; el seed se lo asigna). Validar luego con:
--   alter table public.perfiles validate constraint perfiles_ambito_obligatorio;
alter table public.perfiles
  add constraint perfiles_ambito_obligatorio check (
    (rol = 'coordinador_provincial' and provincia_id is not null)
    or (rol in ('coordinador_recinto', 'veedor') and recinto_id is not null)
  ) not valid;
create index perfiles_recinto_idx on public.perfiles (recinto_id);
-- -----------------------------------------------------------------------------
-- 2. Funciones de ámbito (SECURITY DEFINER, search_path vacío).
--    Leen `perfiles` saltando RLS (sin recursión de políticas) y devuelven NULL si la cuenta
--    está inactiva o todavía tiene la clave temporal: esa cuenta no ve nada del territorio.
-- -----------------------------------------------------------------------------
create function public.rol_actual()
returns text
language sql stable security definer
set search_path = ''
as $$
  select p.rol from public.perfiles p
   where p.id = (select auth.uid()) and p.activo and not p.debe_cambiar_clave
$$;
create function public.recinto_actual()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select p.recinto_id from public.perfiles p
   where p.id = (select auth.uid()) and p.activo and not p.debe_cambiar_clave
$$;
create function public.provincia_actual()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select coalesce(p.provincia_id, r.provincia_id)
    from public.perfiles p
    left join public.recintos r on r.id = p.recinto_id
   where p.id = (select auth.uid()) and p.activo and not p.debe_cambiar_clave
$$;
revoke execute on function public.rol_actual(), public.recinto_actual(), public.provincia_actual() from public, anon;
grant execute on function public.rol_actual(), public.recinto_actual(), public.provincia_actual() to authenticated;
-- -----------------------------------------------------------------------------
-- 3. Privilegios (barrera 1): la app solo puede LEER el territorio; el historial, nada.
-- -----------------------------------------------------------------------------
revoke all on public.provincias, public.recintos, public.mesas, public.mesas_asignaciones_historial from anon, authenticated;
grant select on public.provincias, public.recintos, public.mesas to authenticated;
-- -----------------------------------------------------------------------------
-- 4. RLS (barrera 2): qué filas ve cada rol.
-- -----------------------------------------------------------------------------
alter table public.provincias enable row level security;
alter table public.recintos enable row level security;
alter table public.mesas enable row level security;
alter table public.mesas_asignaciones_historial enable row level security;
-- sin políticas: nadie lo lee desde la app

create policy "provincia_propia_lectura" on public.provincias
  for select to authenticated
  using (id = (select public.provincia_actual()));
create policy "recintos_por_ambito_lectura" on public.recintos
  for select to authenticated
  using (
    ((select public.rol_actual()) = 'coordinador_provincial' and provincia_id = (select public.provincia_actual()))
    or id = (select public.recinto_actual())
  );
create policy "mesas_por_ambito_lectura" on public.mesas
  for select to authenticated
  using (
    ((select public.rol_actual()) = 'coordinador_provincial'
      and recinto_id in (select r.id from public.recintos r where r.provincia_id = (select public.provincia_actual())))
    or ((select public.rol_actual()) = 'coordinador_recinto' and recinto_id = (select public.recinto_actual()))
    -- El veedor ve sus mesas solo dentro de SU recinto (si lo cambian de recinto, deja de verlas).
    or ((select public.rol_actual()) = 'veedor'
      and veedor_id = (select auth.uid()) and recinto_id = (select public.recinto_actual()))
  );
-- -----------------------------------------------------------------------------
-- 5. Equipo a cargo, SIN datos sensibles (sin cédula ni teléfono).
--    coordinador_recinto → sus veedores; coordinador_provincial → sus coordinadores de recinto.
-- -----------------------------------------------------------------------------
create function public.mi_equipo()
returns table (id uuid, nombres text, apellidos text, rol text, recinto_id uuid, activo boolean)
language sql stable security definer
set search_path = ''
as $$
  select p.id, p.nombres, p.apellidos, p.rol, p.recinto_id, p.activo
    from public.perfiles p
   where p.id <> (select auth.uid())
     and (
       ((select public.rol_actual()) = 'coordinador_recinto'
         and p.rol = 'veedor' and p.recinto_id = (select public.recinto_actual()))
       or ((select public.rol_actual()) = 'coordinador_provincial'
         and p.rol = 'coordinador_recinto'
         and p.recinto_id in (select r.id from public.recintos r where r.provincia_id = (select public.provincia_actual())))
     )
$$;
revoke execute on function public.mi_equipo() from public, anon;
grant execute on function public.mi_equipo() to authenticated;
-- -----------------------------------------------------------------------------
-- 6. Asignar un veedor a una mesa (o liberarla con p_veedor = null).
--    - Solo el coordinador de recinto, activo, con la clave ya cambiada y con recinto.
--    - Concurrencia optimista: `p_veedor_esperado` es el veedor que la app VIO; si otro
--      coordinador lo cambió mientras tanto → 'conflicto' (no se sobrescribe en silencio).
--    - Deja historial (quién, cuándo, de quién a quién).
--    Errores con códigos estables en el mensaje (la app los traduce).
-- -----------------------------------------------------------------------------
create function public.asignar_veedor_a_mesa(p_mesa uuid, p_veedor uuid, p_veedor_esperado uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_yo public.perfiles%rowtype;
  v_mesa public.mesas%rowtype;
begin
  select * into v_yo from public.perfiles where id = (select auth.uid());
  if v_yo.id is null or not v_yo.activo or v_yo.rol <> 'coordinador_recinto' or v_yo.recinto_id is null then
    raise exception 'no_autorizado' using errcode = '42501';
  end if;
  if v_yo.debe_cambiar_clave then
    raise exception 'debe_cambiar_clave' using errcode = '42501';
  end if;

  -- FOR UPDATE: bloquea la mesa hasta terminar (evita carreras entre la validación y el UPDATE).
  select * into v_mesa from public.mesas where id = p_mesa for update;
  if v_mesa.id is null or v_mesa.recinto_id is distinct from v_yo.recinto_id then
    raise exception 'mesa_fuera_de_ambito' using errcode = '42501';
  end if;

  if v_mesa.veedor_id is distinct from p_veedor_esperado then
    raise exception 'conflicto' using errcode = 'P0001';
  end if;

  if p_veedor is not null then
    perform 1 from public.perfiles v
     where v.id = p_veedor and v.rol = 'veedor' and v.activo and v.recinto_id = v_yo.recinto_id
       for share;
    if not found then
      raise exception 'veedor_invalido' using errcode = 'P0001';
    end if;
  end if;

  if v_mesa.veedor_id is not distinct from p_veedor then
    return; -- sin cambios: no se registra nada
  end if;

  update public.mesas
     set veedor_id = p_veedor, asignado_por = v_yo.id, asignado_en = now()
   where id = p_mesa;

  insert into public.mesas_asignaciones_historial (mesa_id, veedor_anterior, veedor_nuevo, realizado_por)
  values (p_mesa, v_mesa.veedor_id, p_veedor, v_yo.id);
end;
$$;
revoke execute on function public.asignar_veedor_a_mesa(uuid, uuid, uuid) from public, anon;
grant execute on function public.asignar_veedor_a_mesa(uuid, uuid, uuid) to authenticated;
