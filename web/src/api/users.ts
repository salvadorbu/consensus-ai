import { API_BASE } from './config';

export const deleteUserAccount = async (token: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/users/me`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Failed to delete account');
};
