export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface AuthUser {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}
