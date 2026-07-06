export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
  createdAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: 'patient' | 'doctor';
}

export interface AuthResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}
