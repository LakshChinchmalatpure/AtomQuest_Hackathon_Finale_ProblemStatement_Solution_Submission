import { setAuthTokenGetter } from "@workspace/api-client-react";

export function setupApi() {
  setAuthTokenGetter(() => {
    const token = localStorage.getItem("atomquest_token");
    return token;
  });
}
