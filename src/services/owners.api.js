import apiRequest from "./api.js";
import { API_BASE_URL } from "../config/api.js";

const API_BASE_URLS =
  API_BASE_URL ||
  "http://localhost:5001/api/v1";

function queryString(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const value = query.toString();
  return value ? `?${value}` : "";
}

export function getOwners(params = {}) {
  return apiRequest(`/owners${queryString(params)}`);
}

export function getOwnerStats(params = {}) {
  return apiRequest(`/owners/stats${queryString(params)}`);
}

export function getArchivedOwners(params = {}) {
  return apiRequest(`/owners/archived${queryString(params)}`);
}

export function getOwnerById(ownerId) {
  return apiRequest(`/owners/${ownerId}`);
}

export function createOwner(payload) {
  return apiRequest("/owners", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateOwner(ownerId, payload) {
  return apiRequest(`/owners/${ownerId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function archiveOwner(ownerId) {
  return apiRequest(`/owners/${ownerId}`, {
    method: "DELETE",
  });
}

export function restoreOwner(ownerId) {
  return apiRequest(`/owners/${ownerId}/restore`, {
    method: "POST",
  });
}

export function getOwnerPets(ownerId, params = {}) {
  return apiRequest(
    `/owners/${ownerId}/pets${queryString(params)}`
  );
}

export function getOwnerAppointments(ownerId, params = {}) {
  return apiRequest(
    `/owners/${ownerId}/appointments${queryString(params)}`
  );
}

export function getOwnerFinancialStatement(ownerId, params = {}) {
  return apiRequest(
    `/owners/${ownerId}/statement${queryString(params)}`
  );
}

export async function exportOwnersCsv(params = {}) {
  const token =
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token");

  const response = await fetch(
    `${API_BASE_URLS}/owners/export/csv${queryString(params)}`,
    {
      credentials: "include",
      headers: {
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
      },
    }
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(
      payload?.message || "Unable to export pet owners"
    );
  }

  const blob = await response.blob();
  const disposition =
    response.headers.get("content-disposition") || "";

  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename =
    match?.[1] ||
    `pet-owners-${new Date().toISOString().slice(0, 10)}.csv`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}