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

export function useSosTasks(sosId) {
  const { getToken, isSignedIn } = useAuth();
  return useQuery({
    queryKey: ['sos', sosId, 'tasks'],
    queryFn: () => apiRequest(apiPaths.sosTasks(sosId), {}, getToken),
    enabled: isSignedIn === true && !!sosId,
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

export function useDisasterTasks(disasterId) {
  const { getToken, isSignedIn } = useAuth();
  return useQuery({
    queryKey: ['disasters', disasterId, 'tasks'],
    queryFn: () => apiRequest(apiPaths.disasterTasks(disasterId), {}, getToken),
    enabled: isSignedIn === true && !!disasterId,
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

export function useUsersList() {
  const { getToken, isSignedIn } = useAuth();
  return useQuery({
    queryKey: ['users', 'list'],
    queryFn: () => apiRequest(apiPaths.users, {}, getToken),
    enabled: isSignedIn === true,
  });
}

export function useUpdateUserRole() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, role }) =>
      apiRequest(apiPaths.userRole(uid), { method: 'PUT', body: JSON.stringify({ role }) }, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useCreateDisaster() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      apiRequest(apiPaths.disasters, { method: 'POST', body: JSON.stringify(data) }, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disasters'] });
    },
  });
}

export function useActivateDisaster() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      apiRequest(apiPaths.disasterActivate(id), { method: 'POST' }, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disasters'] });
    },
  });
}

export function useResolveDisaster() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      apiRequest(apiPaths.disasterResolve(id), { method: 'POST' }, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disasters'] });
    },
  });
}

export function useVerifyVolunteer() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isVerified }) =>
      apiRequest(apiPaths.volunteerVerify(id), { method: 'PATCH', body: JSON.stringify({ isVerified }) }, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['volunteers'] });
    },
  });
}

export function useCreateShelter() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      apiRequest(apiPaths.createShelter, { method: 'POST', body: JSON.stringify(data) }, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelters'] });
    },
  });
}

export function useUpdateShelter() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) =>
      apiRequest(apiPaths.updateShelter(id), { method: 'PATCH', body: JSON.stringify(data) }, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelters'] });
    },
  });
}

export function useMarkFound() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      apiRequest(apiPaths.markFound(id), { method: 'PATCH' }, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missing'] });
    },
  });
}

export function useCreateTask() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      apiRequest(apiPaths.createTask, { method: 'POST', body: JSON.stringify(data) }, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sos'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

