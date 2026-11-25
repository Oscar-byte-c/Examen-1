import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, sizes, spacing } from '@/presentation/theme';

import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { EmptyState } from './EmptyState';

type Props = { onCaptura: (uri: string) => void; onCancelar: () => void };

/**
 * ADR-04: la foto se toma DENTRO de la app con la cámara (no se puede elegir de la galería),
 * así cada acta lleva una captura hecha en el momento y con su ubicación.
 */
export function CamaraActa({ onCaptura, onCancelar }: Props) {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const camara = useRef<CameraView>(null);
  const [tomando, setTomando] = useState(false);
  const insets = useSafeAreaInsets();

  if (!permiso) return <View style={styles.root} />;
  if (!permiso.granted) {
    return (
      <View style={[styles.root, styles.centro]}>
        <EmptyState
          icon="photo_camera"
          title="Necesitamos usar la cámara"
          description="La foto del acta es la evidencia del registro."
        />
        <AppButton
          label="Permitir cámara"
          variant="outline"
          size="md"
          fullWidth={false}
          style={styles.botonPermiso}
          onPress={() => void pedirPermiso()}
        />
        <AppButton label="Volver" variant="ghost" onPress={onCancelar} />
      </View>
    );
  }

  const tomar = async () => {
    if (!camara.current || tomando) return;
    setTomando(true);
    try {
      const foto = await camara.current.takePictureAsync({ quality: 0.9, skipProcessing: false });
      if (foto?.uri) onCaptura(foto.uri);
    } finally {
      setTomando(false);
    }
  };

  return (
    <View style={styles.root}>
      <CameraView ref={camara} style={StyleSheet.absoluteFill} facing="back" autofocus="on" />
      <View style={[styles.guia, { marginTop: insets.top + spacing.lg }]}>
        <AppText variant="bodyStrong" color="onPrimary" align="center">
          Encuadra toda el acta, con buena luz y sin mover el celular
        </AppText>
      </View>
      <View style={[styles.acciones, { paddingBottom: insets.bottom + spacing.lg }]}>
        <AppButton label="Tomar foto" icon="photo_camera" size="lg" onPress={tomar} loading={tomando} disabled={tomando} />
        <AppButton label="Cancelar" variant="secondary" onPress={onCancelar} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.text, zIndex: 10 },
  centro: { backgroundColor: colors.background, justifyContent: 'center', padding: spacing.lg },
  // Altura estándar fija: sin ella el `flexGrow` del botón lo estiraba verticalmente.
  botonPermiso: { alignSelf: 'center', flexGrow: 0, height: sizes.buttonMd, marginTop: spacing.sm },
  guia: { marginHorizontal: spacing.md, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.overlay },
  acciones: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: 0, gap: spacing.sm },
});
