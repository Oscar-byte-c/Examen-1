import { PlaceholderScreen } from '@/presentation/components/PlaceholderScreen';
import { useSession } from '@/presentation/navigation/SessionPreviewContext';

export default function CoordinadorRecintoHomeScreen() {
  const { signOut } = useSession();
  return (
    <PlaceholderScreen
      title="Mi recinto"
      description="Aquí el coordinador de recinto gestionará sus veedores, la asignación de mesas y la corrección de actas."
      actionLabel="Cerrar sesión"
      onAction={signOut}
    />
  );
}
