import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

import { AppInput, type AppInputProps } from './AppInput';

type Props<T extends FieldValues> = Omit<AppInputProps, 'value' | 'onChangeText' | 'onBlur' | 'errorText'> & {
  // TransformedValues = any: el esquema Zod puede convertir texto en número al validar.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<T, any, any>;
  name: FieldPath<T>;
};

/**
 * ADR-08: conecta un `AppInput` del sistema de diseño con React Hook Form mediante
 * `Controller`. El error de Zod (ADR-09) se muestra debajo del campo, en línea.
 */
export function CampoTexto<T extends FieldValues>({ control, name, ...props }: Props<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <AppInput
          {...props}
          ref={field.ref}
          value={field.value ?? ''}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          errorText={fieldState.error?.message}
        />
      )}
    />
  );
}
