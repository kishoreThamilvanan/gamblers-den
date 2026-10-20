'use client';

import React, { useState } from 'react';
import { usePokerStore } from '@/lib/store';
import {
  HERO_AVATAR_PRESETS,
  checkEmailRegistrationStatus,
  hasEligiblePasskeyUser,
  isGoogleCloudAuthConfigured,
} from '@/lib/auth/authService';
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Fingerprint,
  CheckCircle2,
  RefreshCw,
  LogOut,
} from 'lucide-react';

type LoginFlowStep = 'initial' | 'email_lookup' | 'signin_password' | 'register_account';

export function AuthGateView() {
  const {
    userProfile,
    loginWithGoogle,
    loginWithPasskey,
    loginWithEmail,
    registerUserWithEmail,
    verifyUserEmail,
    resendUserVerificationEmail,
    logoutUser,
  } = usePokerStore();

  const [step, setStep] = useState<LoginFlowStep>('initial');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [nickname, setNickname] = useState('');
  const [matchedUserName, setMatchedUserName] = useState<string | undefined>(undefined);
  const [matchedHasPasskey, setMatchedHasPasskey] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Touch ID / Face ID is only accessible after a user has logged in for the first time,
  // verified their email, and provided all necessary profile information.
  const canUsePasskeyOnInitial = hasEligiblePasskeyUser();
  const isAwaitingEmailVerification = Boolean(
    userProfile && !userProfile.isGuest && userProfile.emailVerified === false
  );

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setIsLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setIsLoading(true);
    try {
      await loginWithPasskey({
        email: email.trim() || undefined,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Touch ID / Face ID sign-in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setIsLoading(true);
    try {
      const result = await checkEmailRegistrationStatus(email);
      setPassword('');
      if (result.exists) {
        setMatchedUserName(result.displayName);
        setMatchedHasPasskey(Boolean(result.hasPasskey));
        setStep('signin_password');
      } else {
        setMatchedUserName(undefined);
        setMatchedHasPasskey(false);
        const defaultAlias = email.split('@')[0] || '';
        setDisplayName('');
        setNickname(defaultAlias.slice(0, 18));
        setStep('register_account');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Please enter a valid email address.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setIsLoading(true);
    try {
      await loginWithEmail({ email, password });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Invalid password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setIsLoading(true);
    try {
      const cleanName = displayName.trim();
      const cleanNickname = (nickname.trim() || cleanName.split(' ')[0] || 'Player').slice(0, 18);
      await registerUserWithEmail({
        email,
        password,
        displayName: cleanName,
        nickname: cleanNickname,
        avatarUrl: HERO_AVATAR_PRESETS[0].url,
        emailVerified: false,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not create account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setIsLoading(true);
    try {
      await verifyUserEmail();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Could not verify email status yet. Please check your inbox.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setIsLoading(true);
    try {
      const res = await resendUserVerificationEmail();
      setInfoMsg(`Verification link sent to ${res.email}. Please check your inbox.`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Could not resend verification email.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0d0f12] text-white flex flex-col items-center justify-center p-6 font-sans select-none">
      <div className="w-full max-w-sm bg-[#14171c] border border-white/10 rounded-2xl p-7 shadow-2xl transition-all duration-200 space-y-6">
        {/* Clean Minimal Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-[#2A8655] flex items-center justify-center text-white font-black text-base tracking-tight shadow-sm">
            GD
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              {isAwaitingEmailVerification ? 'Verify your email to play' : "Sign in to Gambler's Den"}
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isAwaitingEmailVerification ? (
                <>
                  We sent a verification link to{' '}
                  <span className="text-white font-semibold">{userProfile?.email}</span>
                </>
              ) : (
                <>
                  {step === 'initial' && 'Choose how you would like to continue'}
                  {step === 'email_lookup' && 'Enter your email to sign in or create an account'}
                  {step === 'signin_password' &&
                    (matchedUserName
                      ? `Welcome back, ${matchedUserName}`
                      : 'Enter your password to sign in')}
                  {step === 'register_account' && 'No account found — create yours below'}
                </>
              )}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* MANDATORY EMAIL VERIFICATION GATE */}
        {isAwaitingEmailVerification ? (
          <div className="space-y-3">
            <div className="bg-zinc-900/90 border border-white/10 rounded-xl p-3.5 text-xs text-zinc-300 leading-relaxed space-y-1.5">
              <p>
                Click the verification link in your email inbox, then press the button below to enter the cardroom lobby.
              </p>
              {!isGoogleCloudAuthConfigured() && (
                <p className="text-[11px] text-amber-300/90">
                  Local Dev Mode: Click &ldquo;I&apos;ve Verified — Check Status&rdquo; below to confirm your email immediately.
                </p>
              )}
            </div>

            <button
              type="button"
              disabled={isLoading}
              onClick={handleCheckVerification}
              className="w-full py-2.5 px-4 rounded-xl bg-[#2A8655] hover:bg-[#329a63] text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <CheckCircle2 size={14} />
              <span>
                {isLoading ? 'Checking verification…' : "I've Verified — Check Status"}
              </span>
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={handleResendVerification}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-800/90 hover:bg-zinc-800 text-zinc-200 border border-white/10 font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <RefreshCw size={13} className="text-zinc-400" />
              <span>Resend Verification Email</span>
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                setErrorMsg(null);
                setInfoMsg(null);
                logoutUser();
                setStep('initial');
              }}
              className="w-full py-1.5 text-xs text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <LogOut size={13} />
              <span>Use a different email address</span>
            </button>
          </div>
        ) : (
          <>
            {/* STEP 0: INITIAL COMPACT CHOICES */}
            {step === 'initial' && (
              <div className="space-y-3">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleGoogleLogin}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-semibold text-xs flex items-center justify-center gap-2.5 transition cursor-pointer shadow-sm"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 20.9 7.4 24 12 24z"
                    />
                  </svg>
                  <span>{isLoading ? 'Opening Google Sign-In…' : 'Continue with Google'}</span>
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setErrorMsg(null);
                    setInfoMsg(null);
                    setStep('email_lookup');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-800/90 hover:bg-zinc-800 text-zinc-100 border border-white/10 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Mail size={14} className="text-zinc-400" />
                  <span>Alternative login with Email</span>
                </button>

                {/* Touch ID / Face ID is ONLY shown after the user has logged in for the first time, verified email, and completed their profile */}
                {canUsePasskeyOnInitial && (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handlePasskeyLogin}
                    className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800/70 text-zinc-300 border border-white/5 font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Fingerprint size={14} className="text-zinc-400" />
                    <span>Sign in with Touch ID / Face ID</span>
                  </button>
                )}
              </div>
            )}

            {/* STEP 1: EXPANDED EMAIL LOOKUP */}
            {step === 'email_lookup' && (
              <form onSubmit={handleEmailLookup} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="email"
                      required
                      autoFocus
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#2A8655] hover:bg-[#329a63] text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <span>{isLoading ? 'Checking account…' : 'Continue'}</span>
                  <ArrowRight size={14} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setInfoMsg(null);
                    setStep('initial');
                  }}
                  className="w-full py-1.5 text-xs text-zinc-400 hover:text-white flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  <span>Back to sign-in options</span>
                </button>
              </form>
            )}

            {/* STEP 2A: EMAIL FOUND IN DB -> ENTER PASSWORD TO SIGN IN */}
            {step === 'signin_password' && (
              <form onSubmit={handlePasswordSignIn} className="space-y-4">
                <div className="flex items-center justify-between bg-zinc-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span className="text-zinc-200 truncate">{email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setInfoMsg(null);
                      setStep('email_lookup');
                    }}
                    className="text-emerald-400 hover:underline font-medium ml-2 shrink-0 cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="password"
                      required
                      autoFocus
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#2A8655] hover:bg-[#329a63] text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <span>{isLoading ? 'Signing in…' : 'Sign In'}</span>
                  <ArrowRight size={14} />
                </button>

                {matchedHasPasskey && (
                  <button
                    type="button"
                    onClick={handlePasskeyLogin}
                    className="w-full py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/5 text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Fingerprint size={14} className="text-zinc-400" />
                    <span>Use Touch ID / Face ID instead</span>
                  </button>
                )}
              </form>
            )}

            {/* STEP 2B: EMAIL NOT FOUND IN DB -> ASK USER TO REGISTER & PROVIDE PROFILE INFO */}
            {step === 'register_account' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="flex items-center justify-between bg-zinc-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs">
                  <span className="text-zinc-300 truncate">{email}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setInfoMsg(null);
                      setStep('email_lookup');
                    }}
                    className="text-emerald-400 hover:underline font-medium ml-2 shrink-0 cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      required
                      minLength={2}
                      autoFocus
                      placeholder="Alex Rivera"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Table Alias (Shown on Felt)
                  </label>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={18}
                      placeholder="RiverShark"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Create Password (6+ characters)
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#2A8655] hover:bg-[#329a63] text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <span>{isLoading ? 'Creating account…' : 'Create Account & Verify Email'}</span>
                  <ArrowRight size={14} />
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
