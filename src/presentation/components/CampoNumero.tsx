import { useEffect, useRef, useState } from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Keyboard, StyleSheet, TextInput, View, type EmitterSubscription, type ReturnKeyTypeOptions } from 'react-native';

import { colors, radius, shadows, sizes, spacing, typography } from '@/presentation/theme';

import { AppIcon } from './AppIcon';
import { AppText } from './AppText';

type Props<T extends FieldValues> = {
  // TransformedValues = any: el esquema Zod convierte el texto en número al validar.
  control: Control<T, any, any>;
  name: FieldPath<T>;
  /** Texto principal (p. ej. siglas de la organización o «Votos en blanco»). */
  etiqueta: string;
  /** Texto secundario (p. ej. nombre del candidato). */
  detalle?: string;
  /** Insignia de la lista: número y color de la organización (el color va en el borde, no detrás del texto). */
  marca?: { texto: string; color: string };
  /** Variante grande y centrada (total de sufragantes). */
  grande?: boolean;
  /** Señala en ámbar un campo vacío («Falta este dato»). No valida: la validación es de Zod. */
  mostrarFaltante?: boolean;
  accessibilityLabel: string;
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
};

const vacio = (v: unknown) => typeof v !== 'string' || v.trim() === '';

/**
 * Campo numérico protagonista del asistente del acta (RF-10 / RF-19). Conectado a React Hook
 * Form (`Controller`): el valor y el error vienen del formulario y del esquema Zod del dominio,
 * así que este componente NO valida nada. Cifra grande con dígitos de ancho fijo, hoja clara de
 * alto contraste y estados que no dependen solo del color (ícono + texto).
 */
export function CampoNumero<T extends FieldValues>({
  control,
  name,
  etiqueta,
  detalle,
  marca,
  grande = false,
  mostrarFaltante = false,
  accessibilityLabel,
  returnKeyType = 'done',
  onSubmitEditing,
}: Props<T>) {
  const [enfocado, setEnfocado] = useState(false);
  const inputRef = useRef<TextInput | null>(null);
  const textoRef = useRef('');
  const esperaTeclado = useRef<EmitterSubscription | null>(null);

  const dejarDeEsperar = () => {
    esperaTeclado.current?.remove();
    esperaTeclado.current = null;
  };
  useEffect(() => dejarDeEsperar, []);

  /** Selecciona todo el número: el primer dígito que se escriba lo reemplaza. */
  const seleccionarTodo = () => {
    const input = inputRef.current;
    if (input?.isFocused() && textoRef.current) input.setSelection(0, textoRef.current.length);
  };

  /**
   * Al enfocar, el número queda seleccionado. En Android la selección nativa de
   * `selectTextOnFocus` se pierde al redibujar el campo (borde de foco) y al abrirse el teclado
   * (el diseño cambia de alto), así que se vuelve a aplicar tras el foco y, una sola vez, cuando
   * el teclado termina de abrir. Si el teclado ya estaba abierto (tecla «Siguiente»), basta lo primero.
   */
  const alEnfocar = () => {
    setEnfocado(true);
    requestAnimationFrame(seleccionarTodo);
    dejarDeEsperar();
    if (!Keyboard.isVisible()) {
      esperaTeclado.current = Keyboard.addListener('keyboardDidShow', () => {
        dejarDeEsperar();
        seleccionarTodo();
      });
    }
  };

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const error = fieldState.error?.message;
        const falta = !error && mostrarFaltante && vacio(field.value);
        const borde = error ? colors.error : falta ? colors.ambar : enfocado ? colors.indigo : colors.border;
        textoRef.current = typeof field.value === 'string' ? field.value : '';
        const input = (
          <TextInput
            // Una sola referencia para dos usos: `setFocus` de React Hook Form y la selección.
            ref={(el) => {
              inputRef.current = el;
              field.ref(el);
            }}
            value={field.value ?? ''}
            onChangeText={field.onChange}
            onBlur={() => {
              dejarDeEsperar();
              setEnfocado(false);
              field.onBlur();
            }}
            onFocus={alEnfocar}
            keyboardType="number-pad"
            inputMode="numeric"
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            blurOnSubmit={returnKeyType === 'done'}
            selectTextOnFocus
            maxFontSizeMultiplier={grande ? 1 : 1.2}
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={error ?? (falta ? 'Falta este dato' : undefined)}
            placeholder="—"
            placeholderTextColor={colors.textMuted}
            style={[
              grande ? styles.inputGrande : styles.input,
              { borderColor: borde, borderWidth: error || falta || enfocado ? 2 : 1.5 },
              falta && styles.inputFalta,
            ]}
          />
        );
        return (
          <View style={[styles.tarjeta, grande && styles.tarjetaGrande]}>
            {grande ? (
              <>
                <AppText variant="label" color="textSecondary" align="center">
                  {etiqueta}
                </AppText>
                {input}
              </>
            ) : (
              <View style={styles.fila}>
                {marca ? (
                  <View style={[styles.marca, { borderColor: marca.color }]}>
                    <AppText variant="subtitle" maxFontSizeMultiplier={1.2}>
                      {marca.texto}
                    </AppText>
                  </View>
                ) : null}
                <View style={styles.textos}>
                  <AppText variant="bodyStrong">{etiqueta}</AppText>
                  {detalle ? (
                    <AppText variant="bodySmall" color="textSecondary">
                      {detalle}
                    </AppText>
                  ) : null}
                </View>
                {input}
              </View>
            )}
            {error || falta ? (
              <View style={styles.mensaje} accessibilityLiveRegion="polite">
                <AppIcon name={error ? 'error' : 'pending'} size={sizes.iconSm} color={error ? 'error' : 'ambar'} />
                <AppText variant="caption" color={error ? 'error' : 'ambar'} style={styles.mensajeTexto}>
                  {error ?? 'Falta este dato'}
                </AppText>
              </View>
            ) : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg + 4,
    padding: spacing.sm,
    gap: spacing.xs,
    ...shadows.hoja,
  },
  tarjetaGrande: { padding: spacing.lg, gap: spacing.sm },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  marca: {
    width: sizes.touchMin - 2,
    height: sizes.touchMin - 2,
    borderRadius: radius.md,
    borderWidth: 3,
    backgroundColor: colors.tonal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  input: {
    width: 104,
    minHeight: sizes.input,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
    ...typography.numeral,
    fontSize: 28,
    lineHeight: 34,
  },
  inputGrande: {
    alignSelf: 'stretch',
    minHeight: 88,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    color: colors.indigo,
    textAlign: 'center',
    ...typography.numeral,
    fontSize: 56,
    lineHeight: 66,
  },
  inputFalta: { backgroundColor: colors.ambarSoft },
  mensaje: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  mensajeTexto: { flex: 1, minWidth: 0 },
});
