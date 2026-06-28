import { Session, User } from '@supabase/supabase-js';
import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabase';

type AuthAction = 'idle' | 'signing-in' | 'signing-up' | 'signing-out';

type SignUpResult = {
  success: boolean;
  needsEmailConfirmation: boolean;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  action: AuthAction;
  error: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<boolean>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getAuthErrorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : error && typeof error === 'object' && 'message' in error
          ? String((error as { message: unknown }).message)
          : '';
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('invalid login credentials')) {
    return 'Email or password is incorrect.';
  }

  if (normalizedMessage.includes('email not confirmed')) {
    return 'Please confirm your email before logging in.';
  }

  if (normalizedMessage.includes('user already registered') || normalizedMessage.includes('already been registered')) {
    return 'An account already exists for this email. Log in instead.';
  }

  if (normalizedMessage.includes('password') && normalizedMessage.includes('characters')) {
    return 'Password does not meet the minimum length requirement.';
  }

  if (normalizedMessage.includes('rate limit') || normalizedMessage.includes('too many')) {
    return 'Too many attempts. Wait a moment, then try again.';
  }

  if (normalizedMessage.includes('network') || normalizedMessage.includes('fetch')) {
    return 'Could not reach Supabase. Check your connection and try again.';
  }

  return 'Something went wrong. Please try again.';
}

export function getNormalizedAuthError(error: unknown){
  return getAuthErrorMessage(error).toLowerCase()
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<AuthAction>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    async function loadSession() {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (!isMounted) {
          return;
        }

        if (sessionError) {
          setError(getAuthErrorMessage(sessionError.message));
        }

        setSession(data.session);
      } catch (sessionError) {
        if (isMounted) {
          setError(getAuthErrorMessage(sessionError));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadSession();

    try {
      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
        setLoading(false);
      });
      subscription = data.subscription;
    } catch (sessionError) {
      setError(getAuthErrorMessage(sessionError));
      setLoading(false);
    }

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      action,
      error,
      signIn: async (email, password) => {
        setError(null);
        setAction('signing-in');

        try {
          const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            setError(getAuthErrorMessage(signInError));
            return false;
          }

          setSession(data.session);
          return true;
        } catch (signInError) {
          setError(getAuthErrorMessage(signInError));
          return false;
        } finally {
          setAction('idle');
        }
      },
      signUp: async (email, password) => {
        setError(null);
        setAction('signing-up');

        try {
          const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
          });

          if (signUpError) {
            setError(getAuthErrorMessage(signUpError));
            return { success: false, needsEmailConfirmation: false };
          }

          const alreadyRegistered = data.user?.identities?.length === 0;

          if (alreadyRegistered) {
            setError("This account already exists");
            return{ success: false, needsEmailConfirmation: false };
          }

          setSession(data.session);
          return { success: true, needsEmailConfirmation: !data.session };
        } catch (signUpError) {
          setError(getAuthErrorMessage(signUpError));
          return { success: false, needsEmailConfirmation: false };
        } finally {
          setAction('idle');
        }
      },
      signOut: async () => {
        setError(null);
        setAction('signing-out');

        try {
          const { error: signOutError } = await supabase.auth.signOut();

          if (signOutError) {
            setError(getAuthErrorMessage(signOutError));
            return false;
          }

          return true;
        } catch (signOutError) {
          setError(getAuthErrorMessage(signOutError));
          return false;
        } finally {
          setAction('idle');
        }
      },
      clearError: () => setError(null),
    }),
    [action, error, loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
