import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { CredencialesInvalidasError } from '@/domain/entities/errores';
import { loginSchema } from '@/domain/entities/Usuario';
import { AppButton, AppIcon, AppText, CampoTexto, Retroalimentacion } from '@/presentation/components';
import { PantallaAuth } from '@/presentation/components/PantallaAuth';
import { mensajeDeError } from '@/presentation/hooks/consultas';
import { useAuthStore } from '@/presentation/store/authStore';
import { sizes, spacing } from '@/presentation/theme';

type Entrada = { correo: string; clave: string };

/** Mensaje cuando el servidor rechaza las credenciales. Supabase no distingue si falló el correo
 *  o la clave (para no revelar qué correos tienen cuenta), así que no se afirma cuál de los dos. */
const CREDENCIALES_INCORRECTAS = 'El correo o la clave son incorrectos.';

/**
 * Inicio de sesión (RF-01). React Hook Form + esquema Zod del dominio (ADR-08/09):
 * los errores de formato se muestran en el campo SIN llamar a la red.
 * No existe registro público ni selector de rol: el rol lo decide el servidor.
 * Si el servidor rechaza las credenciales, el campo de clave se sacude (Reanimated) y muestra
 * el mensaje debajo. Errores de red, límite de intentos, cuenta inactiva, etc. NO lo sacuden.
 */
export default function LoginScreen() {
  const iniciarSesion = useAuthStore((s) => s.iniciarSesion);
  const avisoLogin = useAuthStore((s) => s.avisoLogin);
  const [error, setError] = useState<string | null>(null);
  const [sacudidas, setSacudidas] = useState(0);
  const { control, handleSubmit, formState, setError: marcarCampo } = useForm<Entrada>({
    resolver: zodResolver(loginSchema),
    defaultValues: { correo: '', clave: '' },
  });

  const enviar = handleSubmit(async ({ correo, clave }) => {
    setError(null);
    try {
      await iniciarSesion(correo, clave); // los guards llevan al panel del rol
    } catch (e) {
      if (e instanceof CredencialesInvalidasError) {
        marcarCampo('clave', { type: 'server', message: CREDENCIALES_INCORRECTAS });
        setSacudidas((n) => n + 1);
      } else {
        setError(mensajeDeError(e));
      }
    }
  });

  return (
    <PantallaAuth
      titulo="Ingresa a tu cuenta"
      pie={
        <View style={styles.notice}>
          <AppIcon name="verified_user" size={sizes.iconSm} color="textSecondary" />
          <AppText variant="caption" color="textSecondary" style={styles.noticeText}>
            Tu cuenta la crea tu coordinador. Si no tienes acceso, comunícate con él.
          </AppText>
        </View>
      }>
      <CampoTexto
        control={control}
        name="correo"
        label="Correo electrónico"
        icon="mail"
        placeholder="nombre@correo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <CampoTexto
        control={control}
        name="clave"
        label="Clave"
        icon="lock"
        placeholder="Tu clave"
        isPassword
        autoCapitalize="none"
        sacudir={sacudidas}
      />

      {avisoLogin && !error ? <Retroalimentacion tipo="exito" titulo="Clave actualizada" mensaje={avisoLogin} /> : null}
      {formState.isSubmitting ? <Retroalimentacion tipo="proceso" titulo="Verificando tus datos…" /> : null}
      {error ? <Retroalimentacion tipo="error" titulo="No pudimos ingresar" mensaje={error} /> : null}

      <AppButton
        label="Ingresar"
        icon="arrow_forward"
        iconPosition="right"
        onPress={enviar}
        loading={formState.isSubmitting}
        disabled={formState.isSubmitting}
      />
      <AppButton label="¿Olvidaste tu clave?" variant="ghost" size="md" onPress={() => router.push('/recuperar-clave')} />
    </PantallaAuth>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs },
  noticeText: { flex: 1 },
});
