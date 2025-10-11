import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserSettings, updatePersonality } from '../../api/client';
import { AiPersonality } from '../../api/types';

export function useUserSettings() {
  return useQuery({
    queryKey: ['user-settings'],
    queryFn: getUserSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdatePersonality() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (personality: AiPersonality) => updatePersonality(personality),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
    },
  });
}
