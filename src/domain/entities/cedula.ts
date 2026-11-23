/**
 * RF-02: validación de la cédula ecuatoriana (persona natural).
 *  - 10 dígitos.
 *  - Código de provincia 01–24, o 30 (ecuatorianos registrados en el exterior).
 *  - Tercer dígito menor que 6.
 *  - Dígito verificador por módulo 10: coeficientes 2,1,2,1,… sobre los 9 primeros dígitos;
 *    si un producto supera 9 se le resta 9; verificador = (10 − suma mod 10) mod 10.
 * La Edge Function `crear-usuario` aplica la misma regla en el servidor.
 */
export function validarCedula(cedula: string): boolean {
  if (!/^\d{10}$/.test(cedula)) return false;
  const provincia = Number(cedula.slice(0, 2));
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30)) return false;
  if (Number(cedula[2]) >= 6) return false;

  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let producto = Number(cedula[i]) * (i % 2 === 0 ? 2 : 1);
    if (producto > 9) producto -= 9;
    suma += producto;
  }
  return (10 - (suma % 10)) % 10 === Number(cedula[9]);
}
