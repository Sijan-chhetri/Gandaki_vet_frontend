import apiRequest from "./api.js";
import { API_BASE_URL } from "../config/api.js";

const API_BASE_URLS =
  API_BASE_URL ||
  "http://localhost:5001/api/v1";

function queryString(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      query.set(key, String(value));
    }
  });

  const value = query.toString();

  return value ? `?${value}` : "";
}

function normaliseSpeciesPayload(payload) {
  if (typeof payload === "string") {
    return {
      name: payload.trim(),
    };
  }

  return {
    name: payload?.name?.trim(),
  };
}

function getAccessToken() {
  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token")
  );
}

async function downloadCsv(
  endpoint,
  fallbackFilename,
) {
  const accessToken = getAccessToken();

  const response = await fetch(
    `${API_BASE_URLS}${endpoint}`,
    {
      credentials: "include",
      headers: {
        ...(accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : {}),
      },
    },
  );

  if (!response.ok) {
    const result = await response
      .json()
      .catch(() => null);

    if (response.status === 401) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }

    throw new Error(
      result?.message ||
        "Unable to export patient records.",
    );
  }

  const blob = await response.blob();

  const disposition =
    response.headers.get(
      "content-disposition",
    ) || "";

  const filenameMatch =
    disposition.match(
      /filename\*?=(?:UTF-8''|")?([^";]+)/i,
    );

  const filename =
    filenameMatch?.[1]
      ? decodeURIComponent(
          filenameMatch[1].replace(
            /"/g,
            "",
          ),
        )
      : fallbackFilename;

  const objectUrl =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = objectUrl;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(objectUrl);

  return {
    success: true,
    filename,
  };
}

const patientService = {
  /* =====================================================
     PATIENT APIs
  ===================================================== */

  async getPatients(params = {}) {
    return apiRequest(
      `/pets${queryString(params)}`,
    );
  },

  async getPatientById(patientId) {
    return apiRequest(
      `/pets/${patientId}`,
    );
  },

  async createPatient(payload) {
    return apiRequest("/pets", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updatePatient(
    patientId,
    payload,
  ) {
    return apiRequest(
      `/pets/${patientId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  },

  async archivePatient(patientId) {
    return apiRequest(
      `/pets/${patientId}`,
      {
        method: "DELETE",
      },
    );
  },

  async getArchivedPatients(
    params = {},
  ) {
    return apiRequest(
      `/pets/archived${queryString(
        params,
      )}`,
    );
  },

  async restorePatient(patientId) {
    return apiRequest(
      `/pets/${patientId}/restore`,
      {
        method: "POST",
      },
    );
  },

  async updatePatientStatus(
    patientId,
    status,
    reason = "",
  ) {
    return apiRequest(
      `/pets/${patientId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status,
          reason:
            reason?.trim() || null,
        }),
      },
    );
  },

  async transferPatientOwner(
    patientId,
    ownerId,
    reason = "",
  ) {
    return apiRequest(
      `/pets/${patientId}/owner`,
      {
        method: "PATCH",
        body: JSON.stringify({
          ownerId,
          reason:
            reason?.trim() || null,
        }),
      },
    );
  },

  async getPatientStats(params = {}) {
    return apiRequest(
      `/pets/stats${queryString(
        params,
      )}`,
    );
  },

  async getPatientTimeline(
    patientId,
  ) {
    return apiRequest(
      `/pets/${patientId}/timeline`,
    );
  },

  async getPatientWeightHistory(
    patientId,
  ) {
    return apiRequest(
      `/pets/${patientId}/weight-history`,
    );
  },

  async getPatientVaccinationSummary(
    patientId,
  ) {
    return apiRequest(
      `/pets/${patientId}/vaccinations`,
    );
  },

  async exportPatientsCsv(
    params = {},
  ) {
    const date = new Date()
      .toISOString()
      .slice(0, 10);

    return downloadCsv(
      `/pets/export/csv${queryString(
        params,
      )}`,
      `patients-${date}.csv`,
    );
  },

  /* =====================================================
     OWNER APIs
  ===================================================== */

  async getOwners(params = {}) {
    return apiRequest(
      `/owners${queryString(params)}`,
    );
  },

  async getOwnerById(ownerId) {
    return apiRequest(
      `/owners/${ownerId}`,
    );
  },

  async getOwnerPets(
    ownerId,
    params = {},
  ) {
    return apiRequest(
      `/owners/${ownerId}/pets${queryString(
        params,
      )}`,
    );
  },

  /* =====================================================
     SPECIES APIs
  ===================================================== */

  async getSpecies() {
    return apiRequest("/pets/species");
  },

  async createSpecies(payload) {
    return apiRequest(
      "/pets/species",
      {
        method: "POST",
        body: JSON.stringify(
          normaliseSpeciesPayload(
            payload,
          ),
        ),
      },
    );
  },

  async updateSpecies(
    speciesId,
    payload,
  ) {
    return apiRequest(
      `/pets/species/${speciesId}`,
      {
        method: "PATCH",
        body: JSON.stringify(
          normaliseSpeciesPayload(
            payload,
          ),
        ),
      },
    );
  },

  async deleteSpecies(speciesId) {
    return apiRequest(
      `/pets/species/${speciesId}`,
      {
        method: "DELETE",
      },
    );
  },

  /* =====================================================
     BREED APIs
  ===================================================== */

  async getBreeds(speciesId = "") {
    return apiRequest(
      `/pets/breeds${queryString({
        speciesId,
      })}`,
    );
  },

  async createBreed(payload) {
    return apiRequest(
      "/pets/breeds",
      {
        method: "POST",
        body: JSON.stringify({
          speciesId:
            payload?.speciesId?.trim(),
          name:
            payload?.name?.trim(),
        }),
      },
    );
  },

  async updateBreed(
    breedId,
    payload,
  ) {
    return apiRequest(
      `/pets/breeds/${breedId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          ...(payload?.speciesId !==
          undefined
            ? {
                speciesId:
                  payload.speciesId?.trim(),
              }
            : {}),
          ...(payload?.name !==
          undefined
            ? {
                name:
                  payload.name?.trim(),
              }
            : {}),
        }),
      },
    );
  },

  async deleteBreed(breedId) {
    return apiRequest(
      `/pets/breeds/${breedId}`,
      {
        method: "DELETE",
      },
    );
  },
};

export default patientService;