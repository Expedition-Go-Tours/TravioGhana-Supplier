/**
 * Copy for a failed email/password sign-in.
 *
 * The backend sends three deliberate 401s where the credentials were not
 * wrong — the account simply cannot sign in this way. A generic "Email or
 * password is incorrect." is a dead end there: a Google-only user is stuck on
 * a password box with no idea the button they need is right next to it.
 *
 * Everything else stays generic. Never say which of the two credentials was
 * wrong, and never echo a server string that is not on this list.
 */

const SAFE_SIGN_IN_MESSAGES = {
  "This account uses social login. Please sign in with Google.":
    "This account uses Google sign-in. Use Continue with Google below — the password box cannot work for this account.",
  "Password not set. Please use the forgot password option to create one.":
    "This account has no password yet. Use Forgot password? to set one, then sign in with it.",
  "Account has been deactivated":
    "This account has been deactivated. Contact an administrator if you think this is a mistake.",
}

export function getSignInErrorMessage(error) {
  const status = error?.response?.status
  const serverMessage = error?.response?.data?.message

  if (status === 401) {
    return (serverMessage && SAFE_SIGN_IN_MESSAGES[serverMessage]) || "Email or password is incorrect."
  }

  return (
    serverMessage ||
    error?.response?.data?.error ||
    error?.message ||
    "Sign in failed. Please try again."
  )
}
