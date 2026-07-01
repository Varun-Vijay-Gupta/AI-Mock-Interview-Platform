export function logger(message: string, payload?: unknown) {
  console.log(`[mock-interview-api] ${message}`, payload ?? "");
}
