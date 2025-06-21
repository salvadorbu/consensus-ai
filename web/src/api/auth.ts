import { API_BASE } from './config';

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface UserLoginInput {
  email: string;
  password: string;
}

export interface UserRegisterInput extends UserLoginInput {}

export const loginUser = async (data: UserLoginInput): Promise<TokenResponse> => {
  const form = new URLSearchParams();
  form.append('username', data.email);
  form.append('password', data.password);

  const res = await fetch(`${API_BASE}/users/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: form.toString()
  });
  if (!res.ok) throw new Error('Login failed');
  const json = await res.json();
  // Backend returns only token; fetch user info
  const userRes = await fetch(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${json.access_token}` }
  });
  const user = await userRes.json();
  return { ...json, user } as TokenResponse;
};

export const registerUser = async (data: UserRegisterInput): Promise<void> => {
  const res = await fetch(`${API_BASE}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Registration failed');
};
