import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { useDispatch } from 'react-redux';
import { apiRequest, apiPaths, pingBackend } from '../lib/api';
import { setProfile, clearProfile } from '../store/slices/authSlice';

/** Check if backend is reachable (no auth). Use to debug "can frontend reach backend?". */
export function useBackendHealth() {
  return useQuery({
    queryKey: ['backend', 'health'],
    queryFn: pingBackend,
    staleTime: 30 * 1000,
    retry: 1,
  });
}

export function useMe() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const dispatch = useDispatch();

  const query = useQuery({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const token = await getToken({ skipCache: false });
      if (!token) throw new Error('No session token. Complete sign-in and, if you see "Choose organization", select one.');
      return apiRequest(apiPaths.me, {}, () => Promise.resolve(token));
    },
    enabled: isLoaded === true && isSignedIn === true,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => error?.status === 401 && failureCount < 2,
  });

  useEffect(() => {
    if (query.data) dispatch(setProfile(query.data));
    if (query.isError && query.error?.status === 401) dispatch(clearProfile());
  }, [query.data, query.isError, query.error?.status, dispatch]);

  return query;
}

export function useSosList() {
  const { getToken, isSignedIn } = useAuth();
  return useQuery({
    queryKey: ['sos', 'list'],
    queryFn: () => apiRequest(apiPaths.sos, {}, getToken),
    enabled: isSignedIn === true,
  });
}

export function useDisastersList() {
  const { getToken, isSignedIn } = useAuth();
  return useQuery({
    queryKey: ['disasters', 'list'],
    queryFn: () => apiRequest(apiPaths.disasters, {}, getToken),
    enabled: isSignedIn === true,
  });
}

export function useVolunteersList() {
  const { getToken, isSignedIn } = useAuth();
  return useQuery({
    queryKey: ['volunteers', 'list'],
    queryFn: () => apiRequest(apiPaths.volunteers, {}, getToken),
    enabled: isSignedIn === true,
  });
}

export function useSheltersList() {
  const { getToken, isSignedIn } = useAuth();
  return useQuery({
    queryKey: ['shelters', 'list'],
    queryFn: () => apiRequest(apiPaths.shelters, {}, getToken),
    enabled: isSignedIn === true,
  });
}

export function useMissingList() {
  const { getToken, isSignedIn } = useAuth();
  return useQuery({
    queryKey: ['missing', 'list'],
    queryFn: () => apiRequest(apiPaths.missing, {}, getToken),
    enabled: isSignedIn === true,
  });
}

export function useUpdateSosStatus() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) =>
      apiRequest(apiPaths.sosStatus(id), { method: 'PATCH', body: JSON.stringify({ status }) }, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sos'] });
    },
  });
}

export function useServerStats() {
  const { getToken, isSignedIn } = useAuth();
  return useQuery({
    queryKey: ['server', 'stats'],
    queryFn: () => apiRequest(apiPaths.serverStats, {}, getToken),
    enabled: isSignedIn === true,
    refetchInterval: 5000,
    staleTime: 4000,
    retry: 1,
  });
}
