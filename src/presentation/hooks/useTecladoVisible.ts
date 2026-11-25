import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/**
 * Indica si el teclado está abierto. Solo sirve para decidir el diseño (p. ej. compactar el pie
 * fijo mientras se escribe); no interviene en validaciones ni en el guardado.
 * En Android solo existen los eventos «Did» (después de abrir o cerrar).
 */
export function useTecladoVisible(): boolean {
  const [visible, setVisible] = useState(() => Keyboard.isVisible());
  useEffect(() => {
    const abrir = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const cerrar = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      abrir.remove();
      cerrar.remove();
    };
  }, []);
  return visible;
}
