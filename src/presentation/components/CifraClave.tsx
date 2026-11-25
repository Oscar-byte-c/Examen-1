import { StyleSheet, View } from 'react-native';

import { spacing, type ColorToken } from '@/presentation/theme';

import { AppText } from './AppText';

type Props = {
  valor: number | string;
  etiqueta: string;
  color?: ColorToken;
};

/**
 * Cifra destacada de un tablero (p. ej. mesas reportadas). Dígitos de ancho fijo para que no
 * «bailen» al actualizarse en vivo. Tiene un ancho base: en una fila, las cifras que no caben
 * pasan a la siguiente (rejilla 2 × 2 en teléfonos angostos o con fuente grande).
 */
export function CifraClave({ valor, etiqueta, color = 'primary' }: Props) {
  return (
    <View style={styles.cifra} accessible accessibilityLabel={`${etiqueta}: ${valor}`}>
      <AppText variant="numeral" color={color}>
        {valor}
      </AppText>
      <AppText variant="caption" color="textSecondary">
        {etiqueta}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  cifra: { flexGrow: 1, flexBasis: 120, minWidth: 0, gap: spacing.xxs },
});
