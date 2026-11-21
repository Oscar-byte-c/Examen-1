import { PlaceholderScreen } from '@/presentation/components/PlaceholderScreen';
import { useSession } from '@/presentation/navigation/SessionPreviewContext';

export default function CoordinadorProvincialHomeScreen() {
  const { signOut } = useSession();
  return (
    <PlaceholderScreen
      title="Escrutinio provincial"
      description="Aquí el coordinador provincial verá el avance por recinto, los resultados en tiempo real y gestionará recintos y coordinadores."
      actionLabel="Cerrar sesión"
      onAction={signOut}
    />
  );
}
