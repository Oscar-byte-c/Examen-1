-- =============================================================================
-- Datos de prueba (Fase 3A): asigna perfil y rol a 3 usuarios de prueba.
--
-- Mecanismo ADMINISTRATIVO: este archivo se ejecuta con privilegios de servidor
-- (`npx supabase db push --remote --include-seed`), nunca desde la app.
--
-- Requisito previo: crear los 3 usuarios en el panel de Supabase
-- (Authentication → Users → Add user, marcando "Auto Confirm User") con estos correos.
-- Las claves las defines tú en el panel; no se guardan en este repositorio.
--
-- Cédulas ficticias con dígito verificador válido (módulo 10).
-- Idempotente: si el perfil ya existe, no se duplica.
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

insert into public.perfiles (id, cedula, nombres, apellidos, telefono, rol, creado_por, debe_cambiar_clave)
select u.id, '1712345675', 'Paula', 'Provincial Prueba', '0991111111', 'coordinador_provincial', null, false
  from auth.users u where u.email = 'provincial.prueba@example.com'
on conflict (id) do nothing;

insert into public.perfiles (id, cedula, nombres, apellidos, telefono, rol, creado_por, debe_cambiar_clave)
select u.id, '1723456784', 'Ramiro', 'Recinto Prueba', '0992222222', 'coordinador_recinto',
       (select p.id from public.perfiles p join auth.users a on a.id = p.id where a.email = 'provincial.prueba@example.com'),
       false
  from auth.users u where u.email = 'recinto.prueba@example.com'
on conflict (id) do nothing;

insert into public.perfiles (id, cedula, nombres, apellidos, telefono, rol, creado_por, debe_cambiar_clave)
select u.id, '1734567892', 'Valeria', 'Veedora Prueba', '0993333333', 'veedor',
       (select p.id from public.perfiles p join auth.users a on a.id = p.id where a.email = 'recinto.prueba@example.com'),
       false
  from auth.users u where u.email = 'veedor.prueba@example.com'
on conflict (id) do nothing;
