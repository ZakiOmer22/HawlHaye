/* eslint-disable @typescript-eslint/no-require-imports */

interface AuthenticatorLib {
  generateSecret(): string;
  keyuri(account: string, issuer: string, secret: string): string;
  verify(options: { token: string; secret: string }): boolean;
}

interface QrcodeLib {
  toDataURL(text: string): Promise<string>;
}

interface OtplibModule {
  authenticator?: AuthenticatorLib;
  default?: { authenticator?: AuthenticatorLib };
}

interface QrcodeModule {
  toDataURL?: (text: string) => Promise<string>;
  default?: QrcodeLib;
}

const otplibRaw = require("otplib") as OtplibModule;
const qrcodeRaw = require("qrcode") as QrcodeModule;

const foundAuthenticator = otplibRaw.authenticator ?? otplibRaw.default?.authenticator;
if (!foundAuthenticator) {
  throw new Error("otplib 'authenticator' export missing. Run: npm install otplib@12 -w @hawl/api");
}

const qrcodeImpl = (qrcodeRaw.default ?? qrcodeRaw) as QrcodeLib;
if (!qrcodeImpl || typeof qrcodeImpl.toDataURL !== "function") {
  throw new Error("qrcode 'toDataURL' export missing. Run: npm install qrcode -w @hawl/api");
}

export const authenticator: AuthenticatorLib = foundAuthenticator;
export const qrcodeLib: QrcodeLib = qrcodeImpl;
