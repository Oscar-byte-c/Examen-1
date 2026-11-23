-- =============================================================================
-- Datos precargados (RF-05, S-01) y usuarios de prueba.
--
-- Mecanismo ADMINISTRATIVO: se ejecuta con privilegios de servidor
-- (`npm run db:push`, que usa `supabase db push --include-seed`), nunca desde la app.
--
-- Territorio: provincia de Pichincha, cantón Quito (ver ADR-C02 §8). Coordenadas aproximadas.
-- Organizaciones y candidatos: FICTICIOS.
-- Cédulas ficticias con dígito verificador válido (módulo 10).
-- Idempotente: se puede ejecutar varias veces sin duplicar datos.
--
-- Requisito previo: crear en el panel (Authentication → Users → Add user, con "Auto Confirm User")
--   provincial.prueba@example.com · recinto.prueba@example.com · veedor.prueba@example.com
-- =============================================================================

do $$
declare
  faltantes text;
begin
  select string_agg(correo, ', ')
    into faltantes
    from unnest(array[
      'provincial.prueba@example.com',
      'recinto.prueba@example.com',
      'veedor.prueba@example.com'
    ]) as correo
   where not exists (select 1 from auth.users u where u.email = correo);

  if faltantes is not null then
    raise exception 'Faltan usuarios de prueba en Auth: %. Créalos en el panel antes de ejecutar el seed.', faltantes;
  end if;
end;
$$;

-- 1. Recintos de Quito -----------------------------------------------------------
insert into public.recintos (nombre, direccion, parroquia, canton, provincia, latitud, longitud) values
  ('Unidad Educativa Mejía',              'Av. Vargas y Antonio Ante',       'San Blas',       'Quito', 'Pichincha', -0.21410, -78.50330),
  ('Unidad Educativa Juan Montalvo',      'Av. Mariscal Sucre y Tufiño',     'La Magdalena',   'Quito', 'Pichincha', -0.24850, -78.52180),
  ('Unidad Educativa 24 de Mayo',         'Av. Gran Colombia y Yaguachi',    'Itchimbía',      'Quito', 'Pichincha', -0.21520, -78.49980),
  ('Unidad Educativa Manuela Cañizares',  'Av. 6 de Diciembre y Wilson',     'Mariscal Sucre', 'Quito', 'Pichincha', -0.20250, -78.49200),
  ('Unidad Educativa Montúfar',           'Av. Napo y Pedro Pinto Guzmán',   'La Ferroviaria', 'Quito', 'Pichincha', -0.23950, -78.51350)
on conflict (nombre, parroquia) do nothing;

-- 4 mesas por recinto
insert into public.mesas (recinto_id, numero)
select r.id, g from public.recintos r cross join generate_series(1, 4) g
on conflict (recinto_id, numero) do nothing;

-- 2. Organizaciones (ficticias) y candidatos por dignidad ------------------------
insert into public.organizaciones (lista, nombre, siglas, color) values
  (1, 'Movimiento Alianza Ciudadana', 'MAC', '#1565C0'),
  (2, 'Partido Renovación Andina',    'PRA', '#C62828'),
  (3, 'Movimiento Fuerza Verde',      'MFV', '#2E7D32'),
  (4, 'Unión Democrática Popular',    'UDP', '#F9A825'),
  (5, 'Frente Progresista Unido',     'FPU', '#6A1B9A')
on conflict (lista) do nothing;

insert into public.candidatos (organizacion_id, dignidad, nombres)
select o.id, c.dignidad, c.nombres
  from (values
    (1, 'alcaldia', 'Andrea Salazar'),   (1, 'prefectura', 'Marco Villacís'),
    (2, 'alcaldia', 'Diego Paredes'),    (2, 'prefectura', 'Lucía Andrade'),
    (3, 'alcaldia', 'Sofía Guerrero'),   (3, 'prefectura', 'Carlos Benítez'),
    (4, 'alcaldia', 'Javier Morales'),   (4, 'prefectura', 'Gabriela Ruiz'),
    (5, 'alcaldia', 'Fernanda Ortiz'),   (5, 'prefectura', 'Santiago Cevallos')
  ) as c(lista, dignidad, nombres)
  join public.organizaciones o on o.lista = c.lista
on conflict (organizacion_id, dignidad) do nothing;

-- 3. Perfiles de prueba (S-01: el provincial se precarga; es la raíz de la jerarquía) ---
insert into public.perfiles (id, cedula, nombres, apellidos, telefono, rol, recinto_id, creado_por)
select u.id, '1712345675', 'Paula', 'Provincial Prueba', '0991111111', 'coordinador_provincial', null, null
  from auth.users u where u.email = 'provincial.prueba@example.com'
on conflict (id) do nothing;

insert into public.perfiles (id, cedula, nombres, apellidos, telefono, rol, recinto_id, creado_por)
select u.id, '1723456784', 'Ramiro', 'Recinto Prueba', '0992222222', 'coordinador_recinto',
       (select id from public.recintos where nombre = 'Unidad Educativa Mejía'),
       (select a.id from auth.users a where a.email = 'provincial.prueba@example.com')
  from auth.users u where u.email = 'recinto.prueba@example.com'
on conflict (id) do nothing;

insert into public.perfiles (id, cedula, nombres, apellidos, telefono, rol, recinto_id, creado_por)
select u.id, '1734567892', 'Valeria', 'Veedora Prueba', '0993333333', 'veedor',
       (select id from public.recintos where nombre = 'Unidad Educativa Mejía'),
       (select a.id from auth.users a where a.email = 'recinto.prueba@example.com')
  from auth.users u where u.email = 'veedor.prueba@example.com'
on conflict (id) do nothing;

-- 4. Asignación inicial: mesas 1 y 2 del Mejía a la veedora de prueba ------------
insert into public.asignaciones_mesa (mesa_id, veedor_id, asignado_por)
select m.id,
       (select id from auth.users where email = 'veedor.prueba@example.com'),
       (select id from auth.users where email = 'recinto.prueba@example.com')
  from public.mesas m join public.recintos r on r.id = m.recinto_id
 where r.nombre = 'Unidad Educativa Mejía' and m.numero in (1, 2)
   and not exists (select 1 from public.asignaciones_mesa a where a.mesa_id = m.id and a.revocado_en is null);
