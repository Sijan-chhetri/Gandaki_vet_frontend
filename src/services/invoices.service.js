import apiRequest from "./api.js";
import { API_BASE_URL } from "../config/api.js";

const API_BASE_URLS =
  API_BASE_URL ||
  "http://localhost:5001/api/v1";

function queryString(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        query.set(key, String(value));
      }
    },
  );

  const value = query.toString();

  return value ? `?${value}` : "";
}

export function getInvoices(
  params = {},
) {
  return apiRequest(
    `/invoices${queryString(params)}`,
  );
}

export function createInvoice(payload) {
  return apiRequest("/invoices", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function addInvoiceItem(
  invoiceId,
  payload,
) {
  return apiRequest(
    `/invoices/${invoiceId}/items`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function updateInvoiceItem(
  invoiceId,
  itemId,
  payload,
) {
  return apiRequest(
    `/invoices/${invoiceId}/items/${itemId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function deleteInvoiceItem(
  invoiceId,
  itemId,
) {
  return apiRequest(
    `/invoices/${invoiceId}/items/${itemId}`,
    {
      method: "DELETE",
    },
  );
}

export function getOwners(params = {}) {
  return apiRequest(
    `/owners${queryString(params)}`,
  );
}

export function getOwnerPets(
  ownerId,
  params = {},
) {
  return apiRequest(
    `/owners/${ownerId}/pets${queryString(params)}`,
  );
}

export function getInventoryItems(
  params = {},
) {
  return apiRequest(
    `/inventory/items${queryString(params)}`,
  );
}

export function getInvoiceStats(
  params = {},
) {
  return apiRequest(
    `/invoices/stats${queryString(params)}`,
  );
}

export function getOverdueInvoices(
  params = {},
) {
  return apiRequest(
    `/invoices/overdue${queryString(params)}`,
  );
}

export function getInvoiceById(
  invoiceId,
) {
  return apiRequest(
    `/invoices/${invoiceId}`,
  );
}

export function getPrintableInvoice(
  invoiceId,
) {
  return apiRequest(
    `/invoices/${invoiceId}/print`,
  );
}

export function updateInvoice(
  invoiceId,
  payload,
) {
  return apiRequest(
    `/invoices/${invoiceId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function deleteDraftInvoice(
  invoiceId,
) {
  return apiRequest(
    `/invoices/${invoiceId}`,
    {
      method: "DELETE",
    },
  );
}

export function issueInvoice(
  invoiceId,
) {
  return apiRequest(
    `/invoices/${invoiceId}/issue`,
    {
      method: "POST",
    },
  );
}

export function voidInvoice(
  invoiceId,
  payload = {},
) {
  return apiRequest(
    `/invoices/${invoiceId}/void`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function recordInvoicePayment(
  invoiceId,
  payload,
) {
  return apiRequest(
    `/invoices/${invoiceId}/payments`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function getInvoicePayments(
  invoiceId,
) {
  return apiRequest(
    `/invoices/${invoiceId}/payments`,
  );
}

export function refundInvoicePayment(
  invoiceId,
  paymentId,
  payload = {},
) {
  return apiRequest(
    `/invoices/${invoiceId}/payments/${paymentId}/refund`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function getOwnerStatement(
  ownerId,
  params = {},
) {
  return apiRequest(
    `/invoices/owners/${ownerId}/statement${queryString(
      params,
    )}`,
  );
}

/*
 * Change this endpoint only if your
 * payment-method router uses another path.
 */
export function getActivePaymentMethods() {
  return apiRequest(
    "/payments/payment-methods?isActive=true&limit=100",
  );
}

export async function exportInvoicesCsv(
  params = {},
) {
  const token =
    localStorage.getItem(
      "accessToken",
    ) ||
    localStorage.getItem("token");

  const response = await fetch(
    `${API_BASE_URLS}/invoices/export/csv${queryString(
      params,
    )}`,
    {
      credentials: "include",

      headers: {
        ...(token
          ? {
              Authorization:
                `Bearer ${token}`,
            }
          : {}),
      },
    },
  );

  if (!response.ok) {
    const payload = await response
      .json()
      .catch(() => null);

    throw new Error(
      payload?.message ||
        "Unable to export invoices",
    );
  }

  const blob = await response.blob();

  const disposition =
    response.headers.get(
      "content-disposition",
    ) || "";

  const match = disposition.match(
    /filename="?([^"]+)"?/i,
  );

  const filename =
    match?.[1] ||
    `invoices-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

const invoiceService = {
  getInvoices,
  createInvoice,
  addItem: addInvoiceItem,
  updateItem: updateInvoiceItem,
  deleteItem: deleteInvoiceItem,
  getOwners,
  getOwnerPets,
  getInventoryItems,
  getStats: getInvoiceStats,
  getOverdue: getOverdueInvoices,
  getInvoice: getInvoiceById,
  getPrintable: getPrintableInvoice,
  updateInvoice,
  deleteDraft: deleteDraftInvoice,
  issue: issueInvoice,
  void: voidInvoice,
  recordPayment:
    recordInvoicePayment,
  getPayments:
    getInvoicePayments,
  refundPayment:
    refundInvoicePayment,
  getOwnerStatement,
  getPaymentMethods:
    getActivePaymentMethods,
  exportCsv:
    exportInvoicesCsv,
};

export default invoiceService;