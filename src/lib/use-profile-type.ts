import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyProfileType, setMyProfileType, ProfileType } from './personal-profile-api';

const KEY = ['profile-type'] as const;

export function useProfileType() {
  const q = useQuery({
    queryKey: KEY,
    queryFn: getMyProfileType,
    staleTime: 5 * 60 * 1000,  // 5 min
  });

  return {
    profileType: q.data,       // 'coach' | 'player' | null | undefined
    isLoading: q.isLoading,
    isPlayer: q.data === 'player',
    isCoach: q.data === 'coach',
  };
}

export function useSetProfileType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (type: ProfileType) => setMyProfileType(type),
    onSuccess: (newType) => {
      qc.setQueryData(KEY, newType);
    },
  });
}
