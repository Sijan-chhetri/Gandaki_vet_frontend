import apiRequest from "./api";

export function getUsers(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      query.set(key, value);
    }
  });

  const queryString = query.toString();

  return apiRequest(
    `/users${queryString ? `?${queryString}` : ""}`
  );
}

export function getUserStats() {
  return apiRequest("/users/stats");
}

export function getUserById(userId) {
  return apiRequest(`/users/${userId}`);
}

export function createUser(payload) {
  return apiRequest("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateUser(userId, payload) {
  return apiRequest(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function changeUserStatus(userId, isActive) {
  return apiRequest(`/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      isActive,
    }),
  });
}

export function resetUserPassword(
  userId,
  { password, generateTemporaryPassword = false }
) {
  return apiRequest(`/users/${userId}/password`, {
    method: "PATCH",
    body: JSON.stringify({
      ...(password ? { password } : {}),
      generateTemporaryPassword,
    }),
  });
}

export function deleteUser(userId) {
  return apiRequest(`/users/${userId}`, {
    method: "DELETE",
  });
}