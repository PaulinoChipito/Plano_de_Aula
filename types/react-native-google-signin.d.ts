declare module "@react-native-google-signin/google-signin" {
  type SignInData = {
    scopes?: string[];
    user?: {
      email?: string | null;
    };
  };

  type SignInResponse = {
    type: string;
    data?: SignInData;
  };

  export const GoogleSignin: {
    configure(options?: { scopes?: string[]; offlineAccess?: boolean }): void;
    hasPlayServices(options?: { showPlayServicesUpdateDialog?: boolean }): Promise<boolean>;
    hasPreviousSignIn(): boolean;
    signIn(options?: Record<string, unknown>): Promise<SignInResponse>;
    signInSilently(): Promise<SignInResponse>;
    addScopes(options: { scopes: string[] }): Promise<SignInResponse | null>;
    getTokens(): Promise<{ accessToken: string; idToken?: string }>;
    signOut(): Promise<null>;
  };
}
