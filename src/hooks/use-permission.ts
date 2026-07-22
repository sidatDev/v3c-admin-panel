import { useAuth } from '@/providers/auth-provider';

export function usePermission(resource: string, action: string): boolean {
  const { checkPermission } = useAuth();
  return checkPermission(resource, action);
}
