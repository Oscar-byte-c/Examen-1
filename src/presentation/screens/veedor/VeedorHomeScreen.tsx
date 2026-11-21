import { PlaceholderScreen } from '@/presentation/components/PlaceholderScreen';
import { useSession } from '@/presentation/navigation/SessionPreviewContext';

export default function VeedorHomeScreen() {
  const { signOut } = useSession();
  return (
    <PlaceholderScreen
      title="Mis mesas"
      description="Aquí el veedor verá sus mesas asignadas y registrará las actas de alcaldía y prefectura."
      actionLabel="Cerrar sesión"
      onAction={signOut}
    />
  );
}
