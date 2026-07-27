import apiRequest from "./api.js";

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

const speciesService = {
  async getSpecies() {
    return apiRequest("/pets/species");
  },

  async createSpecies(payload) {
    return apiRequest("/pets/species", {
      method: "POST",
      body: JSON.stringify(
        normaliseSpeciesPayload(payload),
      ),
    });
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
          normaliseSpeciesPayload(payload),
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
};

export default speciesService;