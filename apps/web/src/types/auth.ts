export interface AuthUser {
  uid: string;
  isAnonymous: boolean;
  email?: string | null;
}

export type Unsubscribe = () => void;
