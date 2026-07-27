import { API_BASE_URL } from "../config/api";

const API_BASE_URLS =
  API_BASE_URL ||
  "http://localhost:5001/api/v1";

export async function apiRequest(endpoint, options = {}) {
  const accessToken =
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token");

  const response = await fetch(`${API_BASE_URLS}${endpoint}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : {
            "Content-Type": "application/json",
          }),
      ...(accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : {}),
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }

    throw new Error(
      result?.message || "Something went wrong. Please try again."
    );
  }

  return result;
}

export default apiRequest;