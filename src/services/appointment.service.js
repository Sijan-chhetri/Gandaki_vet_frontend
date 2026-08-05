import apiRequest from "./api";

/**
 * Converts an object into a query string.
 *
 * Example:
 * {
 *   page: 1,
 *   status: "CHECKED_IN",
 *   mode: "WALK_IN"
 * }
 *
 * becomes:
 * ?page=1&status=CHECKED_IN&mode=WALK_IN
 */
function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();

  return query ? `?${query}` : "";
}

/**
 * Removes undefined values before sending data.
 * Null values are preserved because the backend may use
 * null to clear optional fields.
 */
function cleanPayload(payload = {}) {
  return Object.fromEntries(
    Object.entries(payload).filter(
      ([, value]) => value !== undefined,
    ),
  );
}

const appointmentService = {
  /**
   * Get all appointments.
   *
   * Supported query examples:
   * {
   *   page,
   *   limit,
   *   search,
   *   status,
   *   type,
   *   mode,
   *   veterinarianId,
   *   ownerId,
   *   petId,
   *   serviceId,
   *   dateFrom,
   *   dateTo,
   *   sortOrder
   * }
   */
  getAppointments(params = {}) {
    return apiRequest(
      `/appointments${buildQuery(params)}`,
    );
  },

  /**
   * Get appointment statistics.
   */
  getAppointmentStats() {
    return apiRequest("/appointments/stats");
  },

  /**
   * Get one appointment by ID.
   */
  getAppointmentById(id) {
    if (!id) {
      throw new Error("Appointment ID is required");
    }

    return apiRequest(`/appointments/${id}`);
  },

  /**
   * Generic appointment creation.
   *
   * Can be used for both:
   * - SCHEDULED
   * - WALK_IN
   */
  createAppointment(payload) {
    return apiRequest("/appointments", {
      method: "POST",
      body: JSON.stringify(
        cleanPayload(payload),
      ),
    });
  },

  /**
   * Create an appointment for an already registered
   * owner and pet.
   *
   * Required:
   * - ownerId
   * - petId
   * - type
   * - scheduledAt
   */
  createScheduledAppointment(payload) {
    const scheduledPayload = cleanPayload({
      ...payload,
      mode: "SCHEDULED",

      // Prevent accidental walk-in information
      // from being stored on a registered appointment.
      walkInOwnerName: null,
      walkInOwnerPhone: null,
      walkInOwnerAddress: null,
      walkInPetName: null,
      walkInPetSpecies: null,
      walkInPetBreed: null,
      walkInPetGender: null,
      walkInPetAge: null,
      walkInPetWeight: null,
    });

    return apiRequest("/appointments", {
      method: "POST",
      body: JSON.stringify(
        scheduledPayload,
      ),
    });
  },

  /**
   * Create an unregistered walk-in appointment.
   *
   * The backend automatically assigns:
   * - scheduledAt = current date and time
   * - status = CHECKED_IN
   * - checkedInAt = current date and time
   *
   * Therefore scheduledAt, ownerId and petId
   * are not required.
   */
  createWalkInAppointment(payload) {
    const walkInPayload = cleanPayload({
      ...payload,
      mode: "WALK_IN",

      // Walk-ins do not initially have registered
      // Owner and Pet records.
      ownerId: null,
      petId: null,

      // The backend automatically uses the
      // current date and time.
      scheduledAt: undefined,
    });

    return apiRequest("/appointments", {
      method: "POST",
      body: JSON.stringify(
        walkInPayload,
      ),
    });
  },

  /**
   * Update either a scheduled or walk-in appointment.
   */
  updateAppointment(id, payload) {
    if (!id) {
      throw new Error("Appointment ID is required");
    }

    return apiRequest(`/appointments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(
        cleanPayload(payload),
      ),
    });
  },

  /**
   * Update walk-in customer and pet information.
   *
   * All fields are optional because the backend
   * preserves values that are not included.
   */
  updateWalkInAppointment(id, payload) {
    if (!id) {
      throw new Error("Appointment ID is required");
    }

    const walkInPayload = cleanPayload({
      ...payload,
      mode: "WALK_IN",
      ownerId: null,
      petId: null,
    });

    return apiRequest(`/appointments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(
        walkInPayload,
      ),
    });
  },

  /**
   * Convert or update an appointment as a registered
   * scheduled appointment.
   *
   * The backend requires valid ownerId and petId.
   */
  updateScheduledAppointment(id, payload) {
    if (!id) {
      throw new Error("Appointment ID is required");
    }

    const scheduledPayload = cleanPayload({
      ...payload,
      mode: "SCHEDULED",
    });

    return apiRequest(`/appointments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(
        scheduledPayload,
      ),
    });
  },

  /**
   * Reschedule an appointment.
   */
  rescheduleAppointment(id, payload) {
    if (!id) {
      throw new Error("Appointment ID is required");
    }

    return apiRequest(
      `/appointments/${id}/reschedule`,
      {
        method: "PATCH",
        body: JSON.stringify(
          cleanPayload(payload),
        ),
      },
    );
  },

  /**
   * Generic status update.
   *
   * Valid status transitions are controlled
   * by the backend.
   */
  updateAppointmentStatus(id, status) {
    if (!id) {
      throw new Error("Appointment ID is required");
    }

    if (!status) {
      throw new Error(
        "Appointment status is required",
      );
    }

    return apiRequest(
      `/appointments/${id}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
    );
  },

  /**
   * Convenient status methods.
   * These use the existing status endpoint.
   */
  confirmAppointment(id) {
    return this.updateAppointmentStatus(
      id,
      "CONFIRMED",
    );
  },

  checkInAppointment(id) {
    return this.updateAppointmentStatus(
      id,
      "CHECKED_IN",
    );
  },

  startAppointment(id) {
    return this.updateAppointmentStatus(
      id,
      "IN_PROGRESS",
    );
  },

  completeAppointment(id) {
    return this.updateAppointmentStatus(
      id,
      "COMPLETED",
    );
  },

  markAppointmentNoShow(id) {
    return this.updateAppointmentStatus(
      id,
      "NO_SHOW",
    );
  },

  /**
   * Cancel an appointment.
   *
   * Uses the separate cancellation endpoint because
   * the backend may require a cancellation reason.
   */
  cancelAppointment(
    id,
    cancellationReason,
  ) {
    if (!id) {
      throw new Error("Appointment ID is required");
    }

    return apiRequest(
      `/appointments/${id}/cancel`,
      {
        method: "PATCH",
        body: JSON.stringify({
          cancellationReason:
            cancellationReason?.trim() || "",
        }),
      },
    );
  },

  /**
   * Soft-delete an appointment.
   */
  deleteAppointment(id) {
    if (!id) {
      throw new Error("Appointment ID is required");
    }

    return apiRequest(`/appointments/${id}`, {
      method: "DELETE",
    });
  },
};

export default appointmentService;