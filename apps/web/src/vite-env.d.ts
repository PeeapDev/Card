/// <reference types="vite/client" />

// Type declaration for @otplib/preset-browser
declare module '@otplib/preset-browser' {
  export const authenticator: {
    generateSecret(length?: number): string;
    generate(secret: string): string;
    verify(options: { token: string; secret: string }): boolean;
    keyuri(user: string, service: string, secret: string): string;
  };
}
