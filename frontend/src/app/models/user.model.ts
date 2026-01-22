export interface User {
  id: number;
  username: string;
  email: string;
  role: 'Admin' | 'User';
  is_approved_uploader: boolean;
  upload_request_sent?: boolean;  // 🔥 הוספה
  profile_image?: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user_id: number;
  username: string;
  role: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}