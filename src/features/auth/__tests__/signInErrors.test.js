import { describe, expect, it } from 'vitest'
import { getSignInErrorMessage } from '../signInErrors'

const err = (status, message) => ({ response: { status, data: { message } } })

describe('getSignInErrorMessage', () => {
  it('tells a Google-only account to use Google', () => {
    const message = getSignInErrorMessage(
      err(401, 'This account uses social login. Please sign in with Google.'),
    )
    expect(message).toContain('Google sign-in')
    expect(message).toContain('Continue with Google')
  })

  it('points a password-less account at Forgot password?', () => {
    const message = getSignInErrorMessage(
      err(401, 'Password not set. Please use the forgot password option to create one.'),
    )
    expect(message).toContain('Forgot password?')
  })

  it('says when an account is deactivated', () => {
    const message = getSignInErrorMessage(err(401, 'Account has been deactivated'))
    expect(message).toContain('deactivated')
    expect(message).toContain('administrator')
  })

  it('stays generic for a wrong password', () => {
    expect(getSignInErrorMessage(err(401, 'Invalid email or password'))).toBe(
      'Email or password is incorrect.',
    )
  })

  it('never echoes an unrecognised 401 string', () => {
    const message = getSignInErrorMessage(
      err(401, 'This account uses social login. Please sign in with Google. — plus injected text'),
    )
    expect(message).toBe('Email or password is incorrect.')
    expect(message).not.toContain('injected')
  })

  it('keeps server messages for non-401 failures (OAuth, 5xx, network)', () => {
    expect(getSignInErrorMessage(err(500, 'Something broke on our side'))).toBe(
      'Something broke on our side',
    )
    expect(getSignInErrorMessage({ message: 'Network Error' })).toBe('Network Error')
    expect(getSignInErrorMessage({})).toBe('Sign in failed. Please try again.')
  })
})
