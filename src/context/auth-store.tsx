import { FunctionsHttpError, Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { createTemporarySupabaseClient, supabase } from '@/lib/supabase';

type AuthAction =
  | 'idle'
  | 'signing-in'
  | 'signing-up'
  | 'signing-out'
  | 'deleting-account'
  | 'requesting-password-reset'
  | 'processing-password-recovery'
  | 'updating-password'
  | 'changing-password'
  | 'signing-out-all';

export type PasswordRecoveryStatus = 'idle' | 'processing' | 'ready' | 'complete' | 'error';

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
  passwordRecoveryStatus: PasswordRecoveryStatus;
  passwordRecoveryError: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<boolean>;
  deleteAccount: (password: string) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  updateRecoveredPassword: (newPassword: string) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  keepPasswordChangeSession: () => void;
  signOutAllAfterPasswordChange: () => Promise<boolean>;
  cancelPasswordRecovery: () => Promise<boolean>;
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

  if (
    normalizedMessage.includes('current password') &&
    (normalizedMessage.includes('incorrect') || normalizedMessage.includes('invalid'))
  ) {
    return 'Current password is incorrect.';
  }

  if (normalizedMessage.includes('email not confirmed')) {
    return 'Please confirm your email before logging in.';
  }

  if (normalizedMessage.includes('user already registered') || normalizedMessage.includes('already been registered')) {
    return 'An account already exists for this email. Log in instead.';
  }

  if (
    normalizedMessage.includes('weak password') ||
    normalizedMessage.includes('password should contain') ||
    (normalizedMessage.includes('password') && normalizedMessage.includes('characters'))
  ) {
    return 'Password does not meet the security requirements.';
  }

  if (normalizedMessage.includes('new password') && normalizedMessage.includes('different')) {
    return 'New password must be different from the current password.';
  }

  if (normalizedMessage.includes('session') && normalizedMessage.includes('missing')) {
    return 'Your session has expired. Log in and try again.';
  }

  if (normalizedMessage.includes('email') && normalizedMessage.includes('invalid')) {
    return 'Enter a valid email address.';
  }

  if (normalizedMessage.includes('rate limit') || normalizedMessage.includes('too many')) {
    return 'Too many attempts. Wait a moment, then try again.';
  }

  if (normalizedMessage.includes('network') || normalizedMessage.includes('fetch')) {
    return 'Could not reach Supabase. Check your connection and try again.';
  }

  return 'Something went wrong. Please try again.';
}

function getCurrentPasswordErrorMessage(error: unknown) {
  const message = getAuthErrorMessage(error);

  return message === 'Email or password is incorrect.'
    ? 'Current password is incorrect.'
    : message;
}

async function getFunctionErrorMessage(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: unknown };

      if (typeof body.error === 'string') {
        return body.error;
      }
    } catch {
      return 'Could not delete your account. Please try again.';
    }
  }

  return getAuthErrorMessage(error);
}

export function getNormalizedAuthError(error: unknown){
  return getAuthErrorMessage(error).toLowerCase()
}

type PasswordRecoveryLink =
  | { type: 'session'; accessToken: string; refreshToken: string }
  | { type: 'error' };

function getPasswordRecoveryLink(url: string): PasswordRecoveryLink | null {
  try {
    const parsedUrl = new URL(url);
    const path = parsedUrl.pathname.replace(/^\/+/, '');
    const isPasswordResetUrl =
      parsedUrl.protocol === 'cooked:' &&
      (parsedUrl.hostname === 'reset-password' || path === 'reset-password');

    if (!isPasswordResetUrl) {
      return null;
    }

    const params = new URLSearchParams(parsedUrl.search);
    const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));

    hashParams.forEach((value, key) => {
      if (!params.has(key)) {
        params.set(key, value);
      }
    });

    if (params.has('error') || params.has('error_code')) {
      return { type: 'error' };
    }

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (params.get('type') !== 'recovery' || !accessToken || !refreshToken) {
      return { type: 'error' };
    }

    return { type: 'session', accessToken, refreshToken };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<AuthAction>('idle');
  const [error, setError] = useState<string | null>(null);
  const [passwordRecoveryStatus, setPasswordRecoveryStatus] = useState<PasswordRecoveryStatus>('idle');
  const [passwordRecoveryError, setPasswordRecoveryError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let lastHandledRecoveryUrl: string | null = null;

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        setSession(nextSession);
      }
    });

    const handlePasswordRecoveryUrl = async (url: string) => {
      const recoveryLink = getPasswordRecoveryLink(url);

      if (!recoveryLink) {
        return false;
      }

      if (url === lastHandledRecoveryUrl) {
        return true;
      }

      lastHandledRecoveryUrl = url;
      setError(null);
      setPasswordRecoveryError(null);

      if (recoveryLink.type === 'error') {
        setPasswordRecoveryStatus('error');
        setPasswordRecoveryError('This password reset link is invalid or has expired. Request a new link and try again.');
        return true;
      }

      setAction('processing-password-recovery');
      setPasswordRecoveryStatus('processing');

      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: recoveryLink.accessToken,
          refresh_token: recoveryLink.refreshToken,
        });

        if (!isMounted) {
          return true;
        }

        if (sessionError || !sessionData.session) {
          setPasswordRecoveryStatus('error');
          setPasswordRecoveryError('This password reset link is invalid or has expired. Request a new link and try again.');
          return true;
        }

        setSession(sessionData.session);
        setPasswordRecoveryStatus('ready');
        return true;
      } catch {
        if (isMounted) {
          setPasswordRecoveryStatus('error');
          setPasswordRecoveryError('Could not open this password reset link. Check your connection and try again.');
        }

        return true;
      } finally {
        if (isMounted) {
          setAction('idle');
        }
      }
    };

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

        const initialUrl = await Linking.getInitialURL();

        if (initialUrl && isMounted) {
          await handlePasswordRecoveryUrl(initialUrl);
        }
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
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      void handlePasswordRecoveryUrl(url);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      action,
      error,
      passwordRecoveryStatus,
      passwordRecoveryError,
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
      deleteAccount: async (password) => {
        setError(null);
        setAction('deleting-account');

        try {
          const { data, error: deleteError } = await supabase.functions.invoke<{ success?: boolean }>(
            'delete-account',
            {
              body: { password },
            },
          );

          if (deleteError) {
            setError(await getFunctionErrorMessage(deleteError));
            return false;
          }

          if (data?.success !== true) {
            setError('Could not delete your account. Please try again.');
            return false;
          }

          await supabase.auth.signOut({ scope: 'local' });
          setSession(null);
          return true;
        } catch (deleteError) {
          setError(await getFunctionErrorMessage(deleteError));
          return false;
        } finally {
          setAction('idle');
        }
      },
      requestPasswordReset: async (email) => {
        setError(null);
        setAction('requesting-password-reset');

        try {
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'cooked://reset-password',
          });

          if (resetError) {
            setError(getAuthErrorMessage(resetError));
            return false;
          }

          return true;
        } catch (resetError) {
          setError(getAuthErrorMessage(resetError));
          return false;
        } finally {
          setAction('idle');
        }
      },
      updateRecoveredPassword: async (newPassword) => {
        setError(null);
        setAction('updating-password');

        try {
          if (passwordRecoveryStatus !== 'ready') {
            setError('Open a valid password reset link before changing your password.');
            return false;
          }

          const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword,
          });

          if (updateError) {
            setError(getAuthErrorMessage(updateError));
            return false;
          }

          setPasswordRecoveryStatus('complete');
          return true;
        } catch (updateError) {
          setError(getAuthErrorMessage(updateError));
          return false;
        } finally {
          setAction('idle');
        }
      },
      changePassword: async (currentPassword, newPassword) => {
        setError(null);
        setAction('changing-password');
        const passwordClient = createTemporarySupabaseClient();
        let hasTemporarySession = false;

        try {
          const activeUser = session?.user;
          const email = activeUser?.email;

          if (!activeUser || !email) {
            setError('Your account email is unavailable. Log in and try again.');
            return false;
          }

          const { data: verificationData, error: verificationError } = await passwordClient.auth.signInWithPassword({
            email,
            password: currentPassword,
          });

          if (verificationError) {
            setError(getCurrentPasswordErrorMessage(verificationError));
            return false;
          }

          hasTemporarySession = Boolean(verificationData.session);

          if (!verificationData.user || verificationData.user.id !== activeUser.id) {
            setError('Current password could not be verified.');
            return false;
          }

          const { error: updateError } = await passwordClient.auth.updateUser({
            current_password: currentPassword,
            password: newPassword,
          });

          if (updateError) {
            setError(getAuthErrorMessage(updateError));
            return false;
          }

          return true;
        } catch (updateError) {
          setError(getAuthErrorMessage(updateError));
          return false;
        } finally {
          if (hasTemporarySession) {
            try {
              await passwordClient.auth.signOut({ scope: 'local' });
            } catch {
              // The temporary client does not persist its session on the device.
            }
          }

          setAction('idle');
        }
      },
      keepPasswordChangeSession: () => {
        setError(null);
        setPasswordRecoveryError(null);
        setPasswordRecoveryStatus('idle');
      },
      signOutAllAfterPasswordChange: async () => {
        setError(null);
        setAction('signing-out-all');

        try {
          const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });

          if (signOutError) {
            setError(getAuthErrorMessage(signOutError));
            return false;
          }

          setPasswordRecoveryError(null);
          setPasswordRecoveryStatus('idle');
          setSession(null);
          return true;
        } catch (signOutError) {
          setError(getAuthErrorMessage(signOutError));
          return false;
        } finally {
          setAction('idle');
        }
      },
      cancelPasswordRecovery: async () => {
        setError(null);
        setPasswordRecoveryError(null);

        if (passwordRecoveryStatus === 'ready' || passwordRecoveryStatus === 'complete') {
          const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });

          if (signOutError) {
            setError(getAuthErrorMessage(signOutError));
            return false;
          }

          setSession(null);
        }

        setPasswordRecoveryStatus('idle');
        return true;
      },
      clearError: () => setError(null),
    }),
    [action, error, loading, passwordRecoveryError, passwordRecoveryStatus, session],
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
