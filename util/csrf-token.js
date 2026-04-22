const crypto = require("crypto");

const CSRF_TOKEN_VERSION = "v1";
const CSRF_TOKEN_PART_PATTERN = /^[a-f0-9]{64}$/i;

function getCsrfSecret() {
  return process.env.CSRF_SECRET || process.env.JWT_SECRET;
}

function createSignature(sessionId, nonce) {
  const secret = getCsrfSecret();
  if (!secret) {
    throw new Error("CSRF_SECRET or JWT_SECRET must be configured.");
  }

  return crypto
    .createHmac("sha256", secret)
    .update(`${CSRF_TOKEN_VERSION}.${sessionId}.${nonce}`)
    .digest("hex");
}

function timingSafeEqualString(left, right) {
  if (typeof left !== "string" || typeof right !== "string") {
    return false;
  }

  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function createCsrfToken(sessionId) {
  if (!sessionId) {
    throw new Error("Session id is required to create a CSRF token.");
  }

  const nonce = crypto.randomBytes(32).toString("hex");
  const signature = createSignature(sessionId, nonce);
  return `${CSRF_TOKEN_VERSION}.${nonce}.${signature}`;
}

function verifyCsrfToken(token, sessionId) {
  if (!token || !sessionId || typeof token !== "string") {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }

  const [version, nonce, signature] = parts;
  if (
    version !== CSRF_TOKEN_VERSION ||
    !CSRF_TOKEN_PART_PATTERN.test(nonce || "") ||
    !CSRF_TOKEN_PART_PATTERN.test(signature || "")
  ) {
    return false;
  }

  let expectedSignature;
  try {
    expectedSignature = createSignature(sessionId, nonce);
  } catch (error) {
    return false;
  }

  return timingSafeEqualString(signature, expectedSignature);
}

module.exports = {
  createCsrfToken,
  verifyCsrfToken,
  timingSafeEqualString,
};
