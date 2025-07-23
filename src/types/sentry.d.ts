// Type declarations for optional @sentry/browser dependency
declare module '@sentry/browser' {
  export function init(options: any): void;
  export function captureException(error: any): void;
  export function captureMessage(message: string): void;
  export function withScope(callback: (scope: any) => void): void;
  export function setTag(key: string, value: string): void;
  export function setContext(key: string, context: any): void;
}