import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { env } from '../config/env.js';

export function generateOTP() {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashOTP(otp) {
  return bcrypt.hash(String(otp), env.bcryptRounds);
}

export function compareOTP(otp, otpHash) {
  if (!otpHash) return false;
  return bcrypt.compare(String(otp), otpHash);
}
