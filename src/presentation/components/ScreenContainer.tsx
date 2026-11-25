import { useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, sizes, spacing } from '@/presentation/theme';

import { PieFijo } from './PieFijo';

type Props = {
  /** Encabezado fijo opcional (p. ej. AppHeader), fuera del área desplazable. */
  header?: ReactNode;
  /** Contenido fijo al pie (p. ej. la suma y el botón Guardar del acta). */
  pie?: ReactNode;
  /** Deslizar hacia abajo para actualizar (además de un botón visible en la pantalla). */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Al cambiar, el contenido vuelve arriba (p. ej. al pasar de un paso a otro del asistente). */
  scrollKey?: string | number;
  /** Menos relleno arriba y en el pie (asistente del acta: más espacio para los campos). */
  compacto?: boolean;
  children: ReactNode;
};

/**
 * Estructura común de pantalla: fondo, encabezado, contenido desplazable, pie opcional y
 * áreas seguras.
 *
 * Teclado: con Android en modo borde a borde (SDK 57) la ventana puede no achicarse al abrir el
 * teclado y los últimos campos quedarían tapados. `KeyboardAvoidingView` (React Native, sin
 * dependencias) añade el espacio necesario. Calcula el solapamiento con su marco RELATIVO al
 * contenedor (que ya incluye el AppHeader), así que `keyboardVerticalOffset` es la posición del
 * contenedor raíz en la ventana (lo que ocupa el encabezado nativo, si lo hay). Si la ventana sí
 * se achica, el solapamiento es 0 y no añade nada.
 */
export function ScreenContainer({ header, pie, onRefresh, refreshing = false, scrollKey, compacto = false, children }: Props) {
  const insets = useSafeAreaInsets();
  const ref = useRef<View>(null);
  const [desplazamiento, setDesplazamiento] = useState(0);

  return (
    <View
      ref={ref}
      style={styles.root}
      onLayout={() => ref.current?.measureInWindow((_x, y) => setDesplazamiento(Math.max(0, y)))}>
      {header}
      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={desplazamiento} style={styles.flex}>
        <View style={styles.flex}>
          <ScrollView
            key={scrollKey}
            contentContainerStyle={[
              styles.content,
              compacto && styles.contentCompacto,
              { paddingBottom: pie ? (compacto ? spacing.md : spacing.lg) : insets.bottom + spacing.xl },
            ]}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
              ) : undefined
            }>
            <View style={styles.inner}>{children}</View>
          </ScrollView>
          {pie ? <PieFijo compacto={compacto}>{pie}</PieFijo> : null}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.md, paddingTop: spacing.lg },
  contentCompacto: { paddingTop: spacing.sm },
  inner: { width: '100%', maxWidth: sizes.maxContentWidth, alignSelf: 'center', gap: spacing.md },
});
