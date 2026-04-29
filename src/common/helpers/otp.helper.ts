export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString(); 
}

export function getOtpExpires(): Date {
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + 5); 
  return expires;
}