-- =============================================================================
-- Migración: retirar el territorio de la iteración previa (20261121230000_territorio.sql).
--
-- Por qué: esa migración se aplicó en Supabase antes de alinear el proyecto con el ADR grupal
-- (modelo provincia → recinto → mesa con mesas.veedor_id y alerta de 500 m). La migración
-- 20261122120000_territorio_actas.sql implementa el modelo acordado (asignaciones con
-- historial, actas, conflictos, alerta de 300 m) y crea objetos con los mismos nombres.
-- Las migraciones aplicadas no se editan: se corrigen con una migración nueva, como esta.
--
-- Datos afectados: solo datos de PRUEBA (territorio y perfiles de prueba). Las cuentas de
-- Auth NO se tocan; el seed vuelve a crear los perfiles de los 3 usuarios de prueba.
-- En una base nueva (supabase db reset) esta migración simplemente deshace la anterior.
-- =============================================================================

-- 1. Funciones de la iteración previa que no se usan en el modelo acordado.
drop function public.asignar_veedor_a_mesa(uuid, uuid, uuid);
drop function public.mi_equipo();

-- 2. Restricciones e índice de `perfiles` que dependen del territorio previo.
--    (perfiles_recinto_fk y perfiles_recinto_idx se vuelven a crear en 20261122120000.)
alter table public.perfiles
  drop constraint perfiles_recinto_fk,
  drop constraint perfiles_ambito_por_rol,
  drop constraint perfiles_ambito_obligatorio;
drop index public.perfiles_recinto_idx;
alter table public.perfiles drop column provincia_id;

-- 3. Tablas del territorio previo (sus políticas RLS y triggers se eliminan con ellas).
--    Van ANTES del paso 4 porque mesas e historial referencian perfiles (asignado_por, etc.).
drop table public.mesas_asignaciones_historial;
drop table public.mesas;
drop table public.recintos;
drop table public.provincias;

-- 4. Perfiles que apuntaban a recintos ya eliminados. El modelo acordado exige recinto para
--    coordinadores de recinto y veedores (perfiles_recinto_segun_rol), así que esos perfiles
--    de prueba se eliminan en una sola sentencia (incluye las referencias creado_por entre ellos).
--    El coordinador provincial (sin recinto) se conserva.
delete from public.perfiles where rol <> 'coordinador_provincial';

-- 5. Funciones de ámbito previas (reemplazadas por privado.mi_rol / privado.mi_recinto).
drop function public.rol_actual();
drop function public.recinto_actual();
drop function public.provincia_actual();
