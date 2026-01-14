---
name: secure-coding
description: Secure coding standards for all code. Triggers on JWT, authentication, crypto, tokens, passwords, secrets, sessions, cookies, authorization, permissions, encryption, hashing, signing, OAuth, API keys.
---

# Secure Coding Standards

## Core Principle

**Never write security code that is "safe by coincidence."**

Code that relies on library defaults for security behavior is a time bomb. Future refactoring, library updates, or developer unfamiliarity can introduce vulnerabilities silently.

## Mandatory Rules

### 1. Explicit Over Implicit

All security-critical behavior must be explicitly configured in code, never rely on defaults.

**Bad:**
```typescript
jwt.verify(token, secret);  // Uses default algorithm from token header
```

**Good:**
```typescript
jwt.verify(token, secret, { algorithms: ['HS256'] });  // Explicit algorithm
```

### 2. JWT Tokens

Always specify:
- `algorithms` array in verify() - prevents algorithm confusion attacks
- `issuer` and `audience` claims - prevents token misuse across services
- Explicit expiration

```typescript
// Signing
jwt.sign(payload, secret, {
  algorithm: 'HS256',
  expiresIn: '7d',
});

// Verification
jwt.verify(token, secret, {
  algorithms: ['HS256'],  // REQUIRED - explicit algorithm
  issuer: 'my-service',
  audience: 'my-frontend',
});
```

### 3. Cookies

Always specify all security attributes:

```typescript
res.cookie('token', value, {
  httpOnly: true,        // Prevents XSS access
  secure: true,          // HTTPS only (in production)
  sameSite: 'strict',    // CSRF protection
  path: '/',             // Explicit scope
  maxAge: 604800000,     // Explicit expiration
});
```

### 4. Cryptography

Never use default algorithms. Always specify:

```typescript
// Hashing
crypto.createHash('sha256');  // Explicit algorithm

// HMAC
crypto.createHmac('sha256', key);  // Explicit algorithm

// Encryption
crypto.createCipheriv('aes-256-gcm', key, iv);  // Explicit cipher
```

### 5. Password Hashing

Use bcrypt or argon2 with explicit cost factors:

```typescript
// bcrypt - explicit rounds
bcrypt.hash(password, 12);  // 12 rounds minimum

// argon2 - explicit parameters
argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
});
```

### 6. OAuth/OIDC

Always validate:
- State parameter (CSRF)
- Nonce (replay attacks)
- Token issuer
- Token audience

```typescript
// Verify ID token
const payload = jwt.verify(idToken, publicKey, {
  algorithms: ['RS256'],
  issuer: 'https://accounts.google.com',
  audience: config.clientId,
});
```

### 7. API Keys & Secrets

- Never log secrets (even partially)
- Never include in error messages
- Use constant-time comparison

```typescript
// Bad - timing attack vulnerable
if (apiKey === storedKey) { }

// Good - constant time
crypto.timingSafeEqual(
  Buffer.from(apiKey),
  Buffer.from(storedKey)
);
```

### 8. Input Validation

Validate and sanitize at system boundaries:

```typescript
// Use Zod with explicit constraints
const schema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});
```

## Checklist Before Writing Security Code

- [ ] Am I relying on any library defaults?
- [ ] Is every algorithm/cipher explicitly specified?
- [ ] Are all token claims validated?
- [ ] Are all cookie attributes set?
- [ ] Is the code self-documenting about its security choices?
- [ ] Would a future developer understand why each option is set?

## Why This Matters

1. **Library updates** can change defaults silently
2. **Refactoring** without full context can break security
3. **Code reviews** miss implicit security assumptions
4. **Audits** flag implicit security as findings
5. **Future you** won't remember why it worked

## Examples of "Safe by Coincidence"

| Code | Why It's Dangerous |
|------|-------------------|
| `jwt.verify(token, secret)` | Algorithm from token header - attacker controlled |
| `res.cookie('token', value)` | Missing httpOnly, secure, sameSite |
| `crypto.createHash()` | No algorithm - varies by Node version |
| `bcrypt.hash(pw, 10)` | 10 rounds may be too low for modern hardware |

## Remember

> "Explicit is better than implicit" - The Zen of Python
>
> This applies doubly to security code.
