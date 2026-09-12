export function investigatorFailureMessage(error) {
  const message = typeof error === "string" ? error.trim() : "";
  if (!message) return "The explanation request failed. Try again.";
  if (message === "Failed to fetch") {
    return "BluePrinted’s server is unavailable. Restart it, then try again.";
  }
  return message;
}
