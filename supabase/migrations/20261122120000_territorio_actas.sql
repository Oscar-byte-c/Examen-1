-- =============================================================================
-- Migración: territorio, catálogo electoral, actas, historial y conflictos.
-- ADR grupal: ADR-01 (bandera en metadatos), ADR-03/10 (sincronización idempotente),
--             ADR-11 (modelo relacional + RLS), S-02, S-03, S-04, S-05 y S-06.
-- Detalle de diseño: docs/adr/ADR-C02-implementacion-adr-grupal.md
--
-- Principio de seguridad: la app solo tiene permiso de LECTURA (filtrado por RLS).
-- Toda escritura pasa por funciones del servidor que revalidan rol, ámbito y datos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Ajuste de `perfiles`: la bandera de clave temporal pasa a app_metadata (ADR-01).
--    app_metadata solo la escribe el servidor (user_metadata la puede editar el usuario).
-- -----------------------------------------------------------------------------
alter table public.perfiles drop column debe_cambiar_clave;

-- Esquema privado para funciones auxiliares de seguridad.
-- No está expuesto por la API de datos, así que no se puede llamar por REST/RPC.
create schema if not exists privado;
revoke all on schema privado from public;
grant usage on schema privado to authenticated;

-- -----------------------------------------------------------------------------
-- 1. Territorio
-- -----------------------------------------------------------------------------
create table public.recintos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (length(trim(nombre)) between 3 and 120),
  direccion   text not null check (length(trim(direccion)) > 0),
  parroquia   text not null check (length(trim(parroquia)) > 0),
  canton      text not null,
  provincia   text not null,
  latitud     double precision not null check (latitud between -90 and 90),
  longitud    double precision not null check (longitud between -180 and 180),
  creado_por  uuid null references public.perfiles (id),
  created_at  timestamptz not null default now(),
  unique (nombre, parroquia)
);

create table public.mesas (
  id          uuid primary key default gen_random_uuid(),
  recinto_id  uuid not null references public.recintos (id) on delete restrict,
  numero      integer not null check (numero between 1 and 500),
  created_at  timestamptz not null default now(),
  unique (recinto_id, numero)
);
create index mesas_recinto_idx on public.mesas (recinto_id);

-- El recinto del perfil (coordinador de recinto o veedor) ahora es una FK real.
alter table public.perfiles
  add constraint perfiles_recinto_fk foreign key (recinto_id) references public.recintos (id),
  add constraint perfiles_recinto_segun_rol
    check ((rol = 'coordinador_provincial') = (recinto_id is null));

-- RF-07: un único coordinador (activo) por recinto. Lo garantiza la base, no la app.
create unique index perfiles_un_coordinador_por_recinto
  on public.perfiles (recinto_id)
  where rol = 'coordinador_recinto' and activo;

-- RF-08 / S-05: asignaciones con historial. Una sola asignación ACTIVA por mesa;
-- un veedor puede tener varias mesas. Revocar = marcar revocado_en (no se borra).
create table public.asignaciones_mesa (
  id            uuid primary key default gen_random_uuid(),
  mesa_id       uuid not null references public.mesas (id),
  veedor_id     uuid not null references public.perfiles (id),
  asignado_por  uuid not null references public.perfiles (id),
  asignado_en   timestamptz not null default now(),
  revocado_en   timestamptz null,
  revocado_por  uuid null references public.perfiles (id),
  check (revocado_en is null or revocado_en >= asignado_en)
);
create unique index asignaciones_una_activa_por_mesa
  on public.asignaciones_mesa (mesa_id) where revocado_en is null;
create index asignaciones_veedor_idx on public.asignaciones_mesa (veedor_id) where revocado_en is null;

-- -----------------------------------------------------------------------------
-- 2. Catálogo electoral (RF-05): 5 organizaciones y un candidato por dignidad.
-- -----------------------------------------------------------------------------
create table public.organizaciones (
  id      uuid primary key default gen_random_uuid(),
  lista   integer not null unique check (lista > 0),
  nombre  text not null unique,
  siglas  text not null,
  color   text not null check (color ~ '^#[0-9A-Fa-f]{6}$')
);

create table public.candidatos (
  id               uuid primary key default gen_random_uuid(),
  organizacion_id  uuid not null references public.organizaciones (id),
  dignidad         text not null check (dignidad in ('alcaldia', 'prefectura')),
  nombres          text not null,
  unique (organizacion_id, dignidad)
);

-- -----------------------------------------------------------------------------
-- 3. Actas (RF-09 a RF-13) — el id lo genera el CLIENTE (UUID, ADR-10).
-- -----------------------------------------------------------------------------
create table public.actas (
  id                   uuid primary key,
  mesa_id              uuid not null references public.mesas (id),
  dignidad             text not null check (dignidad in ('alcaldia', 'prefectura')),
  total_sufragantes    integer not null check (total_sufragantes >= 0),
  votos_blancos        integer not null check (votos_blancos >= 0),
  votos_nulos          integer not null check (votos_nulos >= 0),
  foto_path            text not null,
  latitud              double precision not null check (latitud between -90 and 90),
  longitud             double precision not null check (longitud between -180 and 180),
  precision_gps_m      double precision not null check (precision_gps_m >= 0),
  distancia_recinto_m  double precision not null,
  fuera_de_rango       boolean not null,          -- S-06: > 300 m (alerta, no bloqueo)
  capturada_en         timestamptz not null,      -- momento de la foto (dispositivo)
  version              integer not null default 1 check (version >= 1),
  registrada_por       uuid not null references public.perfiles (id),
  actualizada_por      uuid not null references public.perfiles (id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (mesa_id, dignidad)                       -- ADR-11: máximo 2 actas por mesa
);

create table public.votos_acta (
  acta_id       uuid not null references public.actas (id) on delete cascade,
  candidato_id  uuid not null references public.candidatos (id),
  votos         integer not null check (votos >= 0),
  primary key (acta_id, candidato_id)
);

-- Trazabilidad: cada versión aplicada queda registrada con su autor.
-- operacion_id único = idempotencia (un reintento no crea otra versión).
create table public.actas_historial (
  id              bigint generated always as identity primary key,
  acta_id         uuid not null references public.actas (id) on delete cascade,
  version         integer not null,
  operacion_id    uuid not null unique,
  datos           jsonb not null,
  modificado_por  uuid not null references public.perfiles (id),
  modificado_en   timestamptz not null default now(),
  unique (acta_id, version)
);

-- S-04: si dos dispositivos modifican la misma acta, se conservan AMBAS versiones.
create table public.actas_conflictos (
  id                uuid primary key default gen_random_uuid(),
  acta_id           uuid not null references public.actas (id),
  mesa_id           uuid not null references public.mesas (id),
  dignidad          text not null,
  operacion_id      uuid not null unique,
  version_base      integer not null,
  version_servidor  integer not null,
  datos_servidor    jsonb not null,
  datos_cliente     jsonb not null,
  registrado_por    uuid not null references public.perfiles (id),
  creado_en         timestamptz not null default now(),
  estado            text not null default 'pendiente' check (estado in ('pendiente', 'resuelto')),
  resolucion        text null check (resolucion in ('servidor', 'cliente')),
  resuelto_por      uuid null references public.perfiles (id),
  resuelto_en       timestamptz null
);
create index conflictos_mesa_idx on public.actas_conflictos (mesa_id) where estado = 'pendiente';
-- Índices en claves foráneas usadas por RLS y joins (supabase-postgres-best-practices).
create index conflictos_acta_idx on public.actas_conflictos (acta_id);
create index perfiles_recinto_idx on public.perfiles (recinto_id);
create index asignaciones_mesa_idx on public.asignaciones_mesa (mesa_id);

-- -----------------------------------------------------------------------------
-- 4. Funciones auxiliares de autorización (SECURITY DEFINER, search_path vacío).
--    Leen `perfiles` sin pasar por su RLS (evita recursión) y SIEMPRE filtran
--    por auth.uid(): nadie puede preguntar por otro usuario.
-- -----------------------------------------------------------------------------

-- ADR-01: mientras la clave temporal no se cambie, el usuario no tiene rol efectivo.
create function privado.clave_definitiva()
returns boolean language sql stable set search_path = '' as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'debe_cambiar_clave')::boolean, false) = false;
$$;

-- RF-03: sin correo verificado no hay rol efectivo (defensa en profundidad, además de
-- la opción "Confirm email" de Supabase Auth).
create function privado.correo_confirmado()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.users u
                  where u.id = (select auth.uid()) and u.email_confirmed_at is not null);
$$;

create function privado.mi_rol()
returns text language sql stable security definer set search_path = '' as $$
  select p.rol from public.perfiles p
   where p.id = (select auth.uid()) and p.activo
     and privado.clave_definitiva() and privado.correo_confirmado();
$$;

create function privado.mi_recinto()
returns uuid language sql stable security definer set search_path = '' as $$
  select p.recinto_id from public.perfiles p
   where p.id = (select auth.uid()) and p.activo
     and privado.clave_definitiva() and privado.correo_confirmado();
$$;

-- RF-18: quién puede VER una mesa.
create function privado.puede_ver_mesa(p_mesa uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case privado.mi_rol()
    when 'coordinador_provincial' then true
    when 'coordinador_recinto' then exists (
      select 1 from public.mesas m where m.id = p_mesa and m.recinto_id = privado.mi_recinto())
    when 'veedor' then exists (
      select 1 from public.asignaciones_mesa a
       where a.mesa_id = p_mesa and a.veedor_id = (select auth.uid()) and a.revocado_en is null)
    else false
  end;
$$;

-- RF-13 / ADR-11: quién puede MODIFICAR actas de una mesa. El provincial NO edita.
create function privado.puede_editar_mesa(p_mesa uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case privado.mi_rol()
    when 'coordinador_recinto' then exists (
      select 1 from public.mesas m where m.id = p_mesa and m.recinto_id = privado.mi_recinto())
    when 'veedor' then exists (
      select 1 from public.asignaciones_mesa a
       where a.mesa_id = p_mesa and a.veedor_id = (select auth.uid()) and a.revocado_en is null)
    else false
  end;
$$;

-- Convierte texto a uuid sin lanzar error (rutas de Storage manipuladas → null → sin permiso).
create function privado.uuid_seguro(p text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  return p::uuid;
exception when others then
  return null;
end;
$$;

-- Distancia en metros entre dos coordenadas (fórmula de Haversine), igual que en el dominio.
create function privado.distancia_m(lat1 double precision, lon1 double precision,
                                    lat2 double precision, lon2 double precision)
returns double precision language sql immutable set search_path = '' as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2)));
$$;

revoke all on all functions in schema privado from public;
grant execute on all functions in schema privado to authenticated;

-- -----------------------------------------------------------------------------
-- 5. Privilegios: desde la app SOLO lectura. Las escrituras van por RPC.
-- -----------------------------------------------------------------------------
revoke all on public.recintos, public.mesas, public.asignaciones_mesa, public.organizaciones,
              public.candidatos, public.actas, public.votos_acta, public.actas_historial,
              public.actas_conflictos
  from anon, authenticated;
grant select on public.recintos, public.mesas, public.asignaciones_mesa, public.organizaciones,
                public.candidatos, public.actas, public.votos_acta, public.actas_historial,
                public.actas_conflictos
  to authenticated;

alter table public.recintos          enable row level security;
alter table public.mesas             enable row level security;
alter table public.asignaciones_mesa enable row level security;
alter table public.organizaciones    enable row level security;
alter table public.candidatos        enable row level security;
alter table public.actas             enable row level security;
alter table public.votos_acta        enable row level security;
alter table public.actas_historial   enable row level security;
alter table public.actas_conflictos  enable row level security;

-- -----------------------------------------------------------------------------
-- 6. Políticas RLS de lectura (RF-18).
-- -----------------------------------------------------------------------------
-- Perfiles: además de la propia fila (política existente), el provincial ve a todos
-- y el coordinador de recinto ve a los veedores de su recinto.
create policy "perfiles_supervision_lectura" on public.perfiles
  for select to authenticated
  using (
    (select privado.mi_rol()) = 'coordinador_provincial'
    or ((select privado.mi_rol()) = 'coordinador_recinto' and rol = 'veedor' and recinto_id = (select privado.mi_recinto()))
  );

create policy "recintos_lectura" on public.recintos
  for select to authenticated
  using ((select privado.mi_rol()) = 'coordinador_provincial' or id = (select privado.mi_recinto()));

create policy "mesas_lectura" on public.mesas
  for select to authenticated
  using (privado.puede_ver_mesa(id));

create policy "asignaciones_lectura" on public.asignaciones_mesa
  for select to authenticated
  using (
    (select privado.mi_rol()) = 'coordinador_provincial'
    or ((select privado.mi_rol()) = 'veedor' and veedor_id = (select auth.uid()) and revocado_en is null)
    or ((select privado.mi_rol()) = 'coordinador_recinto' and privado.puede_ver_mesa(mesa_id))
  );

create policy "organizaciones_lectura" on public.organizaciones
  for select to authenticated using ((select privado.mi_rol()) is not null);

create policy "candidatos_lectura" on public.candidatos
  for select to authenticated using ((select privado.mi_rol()) is not null);

create policy "actas_lectura" on public.actas
  for select to authenticated using (privado.puede_ver_mesa(mesa_id));

create policy "votos_lectura" on public.votos_acta
  for select to authenticated
  using (exists (select 1 from public.actas a where a.id = acta_id and privado.puede_ver_mesa(a.mesa_id)));

-- El historial y los conflictos son para supervisión (coordinadores).
create policy "historial_lectura" on public.actas_historial
  for select to authenticated
  using (
    (select privado.mi_rol()) in ('coordinador_provincial', 'coordinador_recinto')
    and exists (select 1 from public.actas a where a.id = acta_id and privado.puede_ver_mesa(a.mesa_id))
  );

create policy "conflictos_lectura" on public.actas_conflictos
  for select to authenticated
  using (
    (select privado.mi_rol()) in ('coordinador_provincial', 'coordinador_recinto')
    and privado.puede_ver_mesa(mesa_id)
  );

-- -----------------------------------------------------------------------------
-- 7. Storage: fotos de actas (evidencia). Bucket privado, solo JPEG, máx. 5 MB.
--    Ruta: {mesa_id}/{acta_id}/{operacion_id}.jpg — sin UPDATE ni DELETE:
--    una foto subida no se puede reemplazar ni borrar desde la app.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('actas-fotos', 'actas-fotos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

create policy "fotos_actas_subida" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'actas-fotos'
    and privado.puede_editar_mesa(privado.uuid_seguro((storage.foldername(name))[1]))
  );

create policy "fotos_actas_lectura" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'actas-fotos'
    and privado.puede_ver_mesa(privado.uuid_seguro((storage.foldername(name))[1]))
  );

-- -----------------------------------------------------------------------------
-- 8. Escritura de actas: única puerta, transaccional e idempotente.
-- -----------------------------------------------------------------------------

-- Fotografía JSON completa de un acta (para historial y conflictos).
create function privado.snapshot_acta(p_acta uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select to_jsonb(a) || jsonb_build_object('votos', coalesce((
           select jsonb_agg(jsonb_build_object('candidato_id', v.candidato_id, 'votos', v.votos))
             from public.votos_acta v where v.acta_id = a.id), '[]'::jsonb))
    from public.actas a where a.id = p_acta;
$$;

-- Valida un acta (S-03 / RF-19). Lanza 'acta_invalida' si algo no cuadra.
create function privado.validar_acta(p jsonb, p_dignidad text)
returns void language plpgsql stable security definer set search_path = '' as $$
declare
  v_total   integer := (p ->> 'total_sufragantes')::integer;
  v_blancos integer := (p ->> 'votos_blancos')::integer;
  v_nulos   integer := (p ->> 'votos_nulos')::integer;
  v_validos integer;
  v_items   integer;
  v_ok      integer;
begin
  if v_total is null or v_blancos is null or v_nulos is null
     or v_total < 0 or v_blancos < 0 or v_nulos < 0 then
    raise exception 'acta_invalida: valores vacíos o negativos' using errcode = '22023';
  end if;

  select count(*), coalesce(sum((x ->> 'votos')::integer), 0),
         count(*) filter (where (x ->> 'votos')::integer between 0 and v_total
                            and exists (select 1 from public.candidatos c
                                         where c.id = (x ->> 'candidato_id')::uuid and c.dignidad = p_dignidad))
    into v_items, v_validos, v_ok
    from jsonb_array_elements(coalesce(p -> 'votos', '[]'::jsonb)) x;

  if v_items <> (select count(*) from public.candidatos c where c.dignidad = p_dignidad) or v_ok <> v_items then
    raise exception 'acta_invalida: votos por candidato incompletos, negativos o mayores al total' using errcode = '22023';
  end if;

  if v_validos + v_blancos + v_nulos <> v_total then
    raise exception 'acta_invalida: válidos + blancos + nulos no coincide con el total de sufragantes' using errcode = '22023';
  end if;

  if (p ->> 'latitud') is null or (p ->> 'longitud') is null or (p ->> 'precision_gps_m') is null then
    raise exception 'acta_invalida: la ubicación GPS es obligatoria' using errcode = '22023';
  end if;
end;
$$;

-- Escribe los datos (insert o update) y registra la versión en el historial.
create function privado.escribir_acta(p_id uuid, p_mesa uuid, p_dignidad text, p jsonb,
                                      p_operacion uuid, p_nueva boolean)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_uid       uuid := (select auth.uid());
  v_recinto   public.recintos;
  v_distancia double precision;
  v_version   integer;
begin
  select r.* into v_recinto from public.recintos r join public.mesas m on m.recinto_id = r.id where m.id = p_mesa;
  -- S-06: la distancia la calcula el SERVIDOR (no se confía en el valor del cliente).
  v_distancia := privado.distancia_m((p ->> 'latitud')::float8, (p ->> 'longitud')::float8,
                                     v_recinto.latitud, v_recinto.longitud);

  if p_nueva then
    insert into public.actas (id, mesa_id, dignidad, total_sufragantes, votos_blancos, votos_nulos,
                              foto_path, latitud, longitud, precision_gps_m, distancia_recinto_m,
                              fuera_de_rango, capturada_en, version, registrada_por, actualizada_por)
    values (p_id, p_mesa, p_dignidad, (p ->> 'total_sufragantes')::int, (p ->> 'votos_blancos')::int,
            (p ->> 'votos_nulos')::int, p ->> 'foto_path', (p ->> 'latitud')::float8,
            (p ->> 'longitud')::float8, (p ->> 'precision_gps_m')::float8, v_distancia,
            v_distancia > 300, (p ->> 'capturada_en')::timestamptz, 1, v_uid, v_uid);
    v_version := 1;
  else
    update public.actas set
      total_sufragantes = (p ->> 'total_sufragantes')::int,
      votos_blancos     = (p ->> 'votos_blancos')::int,
      votos_nulos       = (p ->> 'votos_nulos')::int,
      foto_path         = p ->> 'foto_path',
      latitud           = (p ->> 'latitud')::float8,
      longitud          = (p ->> 'longitud')::float8,
      precision_gps_m   = (p ->> 'precision_gps_m')::float8,
      distancia_recinto_m = v_distancia,
      fuera_de_rango    = v_distancia > 300,
      capturada_en      = (p ->> 'capturada_en')::timestamptz,
      version           = version + 1,
      actualizada_por   = v_uid,
      updated_at        = now()
    where id = p_id
    returning version into v_version;
    delete from public.votos_acta where acta_id = p_id;
  end if;

  insert into public.votos_acta (acta_id, candidato_id, votos)
  select p_id, (x ->> 'candidato_id')::uuid, (x ->> 'votos')::int
    from jsonb_array_elements(p -> 'votos') x;

  insert into public.actas_historial (acta_id, version, operacion_id, datos, modificado_por)
  values (p_id, v_version, p_operacion, privado.snapshot_acta(p_id), v_uid);

  return v_version;
end;
$$;

/**
 * Sincroniza un acta desde la outbox del dispositivo (ADR-03, ADR-10, S-04).
 * Respuesta: { estado: 'aplicada' | 'conflicto', version, acta_id }.
 *   - Reintento de la misma operación → misma respuesta, sin duplicar (idempotencia).
 *   - version_base distinta a la del servidor → NO sobrescribe: guarda el conflicto.
 */
create function public.sincronizar_acta(p_operacion_id uuid, p_acta jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id        uuid := (p_acta ->> 'id')::uuid;
  v_mesa      uuid := (p_acta ->> 'mesa_id')::uuid;
  v_dignidad  text := p_acta ->> 'dignidad';
  v_base      integer := coalesce((p_acta ->> 'version_base')::integer, 0);
  v_actual    public.actas;
  v_version   integer;
begin
  if v_id is null or v_mesa is null or v_dignidad not in ('alcaldia', 'prefectura') then
    raise exception 'acta_invalida: faltan identificadores' using errcode = '22023';
  end if;

  -- 1. Autorización (RF-13 / RF-18 / S-05): se revalida en cada envío.
  if not privado.puede_editar_mesa(v_mesa) then
    raise exception 'sin_permiso: no puedes modificar actas de esta mesa' using errcode = '42501';
  end if;

  -- 2. Idempotencia: ¿esta operación ya se procesó?
  select h.version into v_version from public.actas_historial h where h.operacion_id = p_operacion_id;
  if found then
    return jsonb_build_object('estado', 'aplicada', 'version', v_version, 'acta_id', v_id);
  end if;
  if exists (select 1 from public.actas_conflictos c where c.operacion_id = p_operacion_id) then
    return jsonb_build_object('estado', 'conflicto', 'acta_id', v_id);
  end if;

  -- 3. Validación de datos (el servidor no confía en la validación del cliente).
  perform privado.validar_acta(p_acta, v_dignidad);
  -- La foto debe estar en la carpeta {mesa}/{acta}/ y haberla subido QUIEN envía el acta:
  -- no se puede reutilizar la evidencia de otra acta ni la de otra persona.
  if not exists (select 1 from storage.objects o
                  where o.bucket_id = 'actas-fotos' and o.name = p_acta ->> 'foto_path'
                    and privado.uuid_seguro((storage.foldername(o.name))[1]) = v_mesa
                    and privado.uuid_seguro((storage.foldername(o.name))[2]) = v_id
                    and o.owner_id = (select auth.uid())::text) then
    raise exception 'acta_invalida: la fotografía no se encuentra en el servidor' using errcode = '22023';
  end if;

  -- 4. Bloqueo de la fila para que dos envíos simultáneos no se pisen.
  select a.* into v_actual from public.actas a
   where a.mesa_id = v_mesa and a.dignidad = v_dignidad for update;

  if not found then
    v_version := privado.escribir_acta(v_id, v_mesa, v_dignidad, p_acta, p_operacion_id, true);
    return jsonb_build_object('estado', 'aplicada', 'version', v_version, 'acta_id', v_id);
  end if;

  if v_actual.id = v_id and v_actual.version = v_base then
    v_version := privado.escribir_acta(v_id, v_mesa, v_dignidad, p_acta, p_operacion_id, false);
    return jsonb_build_object('estado', 'aplicada', 'version', v_version, 'acta_id', v_id);
  end if;

  -- 5. Conflicto (S-04): se conservan ambas versiones; decide el coordinador de recinto.
  insert into public.actas_conflictos (acta_id, mesa_id, dignidad, operacion_id, version_base,
                                       version_servidor, datos_servidor, datos_cliente, registrado_por)
  values (v_actual.id, v_mesa, v_dignidad, p_operacion_id, v_base, v_actual.version,
          privado.snapshot_acta(v_actual.id), p_acta, (select auth.uid()));
  return jsonb_build_object('estado', 'conflicto', 'acta_id', v_actual.id);
end;
$$;

/** El coordinador de recinto decide qué versión prevalece (S-04). */
create function public.resolver_conflicto(p_conflicto uuid, p_eleccion text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_c       public.actas_conflictos;
  v_version integer;
begin
  if p_eleccion not in ('servidor', 'cliente') then
    raise exception 'acta_invalida: elección no válida' using errcode = '22023';
  end if;
  -- El rol se valida ANTES de buscar: así no se revela si un conflicto existe.
  if privado.mi_rol() is distinct from 'coordinador_recinto' then
    raise exception 'sin_permiso: solo el coordinador del recinto resuelve conflictos' using errcode = '42501';
  end if;
  select * into v_c from public.actas_conflictos where id = p_conflicto and estado = 'pendiente' for update;
  if not found or not privado.puede_editar_mesa(v_c.mesa_id) then
    raise exception 'no_encontrado: el conflicto no existe o ya fue resuelto' using errcode = 'P0002';
  end if;

  if p_eleccion = 'cliente' then
    perform privado.validar_acta(v_c.datos_cliente, v_c.dignidad);
    -- Si el acta cambió después de registrarse el conflicto, el coordinador estaría
    -- decidiendo con datos viejos: se rechaza y debe revisar de nuevo.
    if (select a.version from public.actas a where a.id = v_c.acta_id for update) <> v_c.version_servidor then
      raise exception 'dato_invalido: el acta cambió después del conflicto; actualiza la pantalla y revisa de nuevo' using errcode = '22023';
    end if;
    v_version := privado.escribir_acta(v_c.acta_id, v_c.mesa_id, v_c.dignidad, v_c.datos_cliente,
                                       gen_random_uuid(), false);
  end if;

  update public.actas_conflictos
     set estado = 'resuelto', resolucion = p_eleccion, resuelto_por = (select auth.uid()), resuelto_en = now()
   where id = p_conflicto;
  return jsonb_build_object('estado', 'resuelto', 'version', v_version);
end;
$$;

-- -----------------------------------------------------------------------------
-- 9. Territorio: registro de recintos (RF-06) y asignación de mesas (RF-08, RF-20, S-05).
-- -----------------------------------------------------------------------------
create function public.crear_recinto(p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id     uuid;
  v_mesas  integer := (p ->> 'numero_mesas')::integer;
  v_ref    public.recintos;
begin
  if privado.mi_rol() is distinct from 'coordinador_provincial' then
    raise exception 'sin_permiso: solo el coordinador provincial registra recintos' using errcode = '42501';
  end if;
  if v_mesas is null or v_mesas not between 1 and 100 then
    raise exception 'dato_invalido: el número de mesas debe estar entre 1 y 100' using errcode = '22023';
  end if;
  -- Jurisdicción: la provincia y el cantón se toman del territorio precargado, no del cliente.
  select * into v_ref from public.recintos order by created_at limit 1;

  insert into public.recintos (nombre, direccion, parroquia, canton, provincia, latitud, longitud, creado_por)
  values (trim(p ->> 'nombre'), trim(p ->> 'direccion'), trim(p ->> 'parroquia'),
          coalesce(v_ref.canton, 'Quito'), coalesce(v_ref.provincia, 'Pichincha'),
          (p ->> 'latitud')::float8, (p ->> 'longitud')::float8, (select auth.uid()))
  returning id into v_id;

  insert into public.mesas (recinto_id, numero) select v_id, g from generate_series(1, v_mesas) g;
  return v_id;
end;
$$;

/** Asigna (o reasigna) una mesa a un veedor. La asignación anterior se revoca de inmediato (S-05). */
create function public.asignar_mesa(p_mesa uuid, p_veedor uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_recinto uuid;
begin
  if privado.mi_rol() is distinct from 'coordinador_recinto' then
    raise exception 'sin_permiso: solo el coordinador de recinto asigna mesas' using errcode = '42501';
  end if;
  select m.recinto_id into v_recinto from public.mesas m where m.id = p_mesa for update;
  if v_recinto is null or v_recinto <> privado.mi_recinto() then
    raise exception 'sin_permiso: la mesa no pertenece a tu recinto' using errcode = '42501';
  end if;
  if not exists (select 1 from public.perfiles p
                  where p.id = p_veedor and p.rol = 'veedor' and p.activo and p.recinto_id = v_recinto) then
    raise exception 'dato_invalido: el veedor no pertenece a tu recinto o está inactivo' using errcode = '22023';
  end if;
  if exists (select 1 from public.asignaciones_mesa a
              where a.mesa_id = p_mesa and a.veedor_id = p_veedor and a.revocado_en is null) then
    return;  -- ya estaba asignada a ese veedor (idempotente)
  end if;

  update public.asignaciones_mesa
     set revocado_en = now(), revocado_por = (select auth.uid())
   where mesa_id = p_mesa and revocado_en is null;

  insert into public.asignaciones_mesa (mesa_id, veedor_id, asignado_por)
  values (p_mesa, p_veedor, (select auth.uid()));
end;
$$;

-- -----------------------------------------------------------------------------
-- 10. Seguimiento del escrutinio (RF-15, S-02). SECURITY INVOKER: la RLS filtra
--     automáticamente lo que cada rol puede ver.
-- -----------------------------------------------------------------------------
create function public.avance_por_recinto()
returns table (recinto_id uuid, nombre text, latitud double precision, longitud double precision,
               mesas_total bigint, mesas_reportadas bigint, mesas_parciales bigint)
language sql stable security invoker set search_path = '' as $$
  with por_mesa as (
    select m.id, m.recinto_id, count(a.id) as actas
      from public.mesas m left join public.actas a on a.mesa_id = m.id
     group by m.id, m.recinto_id
  )
  select r.id, r.nombre, r.latitud, r.longitud,
         count(pm.id),
         count(pm.id) filter (where pm.actas = 2),
         count(pm.id) filter (where pm.actas = 1)
    from public.recintos r left join por_mesa pm on pm.recinto_id = r.id
   group by r.id order by r.nombre;
$$;

create function public.conteo_por_candidato()
returns table (dignidad text, candidato_id uuid, candidato text, organizacion text, lista integer,
               color text, votos bigint)
language sql stable security invoker set search_path = '' as $$
  select c.dignidad, c.id, c.nombres, o.nombre, o.lista, o.color, coalesce(sum(v.votos), 0)
    from public.candidatos c
    join public.organizaciones o on o.id = c.organizacion_id
    left join public.votos_acta v on v.candidato_id = c.id
   group by c.id, o.id
   order by c.dignidad, o.lista;
$$;

-- Mínimo privilegio: las funciones internas de escritura solo se ejecutan desde las
-- funciones públicas de arriba (que corren como su dueño), nunca directamente.
revoke execute on function privado.snapshot_acta(uuid), privado.validar_acta(jsonb, text),
                           privado.escribir_acta(uuid, uuid, text, jsonb, uuid, boolean)
  from public, authenticated;

revoke all on function public.sincronizar_acta(uuid, jsonb), public.resolver_conflicto(uuid, text),
                       public.crear_recinto(jsonb), public.asignar_mesa(uuid, uuid),
                       public.avance_por_recinto(), public.conteo_por_candidato()
  from public, anon;
grant execute on function public.sincronizar_acta(uuid, jsonb), public.resolver_conflicto(uuid, text),
                          public.crear_recinto(jsonb), public.asignar_mesa(uuid, uuid),
                          public.avance_por_recinto(), public.conteo_por_candidato()
  to authenticated;

-- -----------------------------------------------------------------------------
-- 11. Recuperación de clave (RF-04): solo para correos verificados.
--     Solo la ejecuta la Edge Function con service_role (nunca la app).
-- -----------------------------------------------------------------------------
create function public.correo_verificado(p_correo text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.users u
                  where lower(u.email) = lower(trim(p_correo)) and u.email_confirmed_at is not null);
$$;
revoke all on function public.correo_verificado(text) from public, anon, authenticated;
grant execute on function public.correo_verificado(text) to service_role;

-- -----------------------------------------------------------------------------
-- 12. Realtime (ADR-07): el dashboard se actualiza cuando cambian actas o conflictos.
--     Realtime respeta la RLS de cada usuario.
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table public.actas, public.actas_conflictos;
