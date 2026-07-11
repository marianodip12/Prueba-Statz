import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProfileType } from '@/lib/use-profile-type';

interface Props {
  children: React.ReactNode;
}

/**
 * - Si el user es 'player' y está en una ruta de coach → redirect a /app/player/home
 * - Si el user es 'coach' y está en /app/player/* → redirect a /app
 */
export function ProfileTypeGuard({ children }: Props) {
  const { profileType, isLoading } = useProfileType();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || !profileType) return;
    const path = location.pathname;
    const isPlayerRoute = path.startsWith('/app/player');
    const isCoachOnlyRoute =
      path.startsWith('/app') && !isPlayerRoute && path !== '/app';

    if (profileType === 'player' && isCoachOnlyRoute) {
      navigate('/app/player/home', { replace: true });
    } else if (profileType === 'coach' && isPlayerRoute) {
      navigate('/app', { replace: true });
    }
  }, [profileType, isLoading, location.pathname, navigate]);

  return <>{children}</>;
}
