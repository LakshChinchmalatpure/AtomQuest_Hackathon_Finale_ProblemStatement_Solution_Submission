import { setAuthTokenGetter } from "@/lib/api-client";

export function setupApi() {
  setAuthTokenGetter(() => {
    const token = localStorage.getItem("atomquest_token");
    return token;
  });
}
