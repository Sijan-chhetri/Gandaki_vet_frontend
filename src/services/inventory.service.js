import apiRequest from "./api.js";
import { API_BASE_URL } from "../config/api.js";

// const API_BASE_URLS =
//   API_BASE_URL ||
//   "http://localhost:5001/api/v1";


const API_BASE_URLS =
  API_BASE_URL ||
  "https://vetbackend-myme.onrender.com/api/v1";

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

/* -------------------------------------------------------------------------- */
/*                              Inventory items                               */
/* -------------------------------------------------------------------------- */

export function getInventoryItems(params = {}) {
  return apiRequest(
    `/inventory/items${queryString(params)}`
  );
}

export function getInventoryItemById(itemId) {
  return apiRequest(
    `/inventory/items/${itemId}`
  );
}

export function getInventoryItemByBarcode(barcode) {
  return apiRequest(
    `/inventory/items/barcode/${encodeURIComponent(barcode)}`
  );
}

export function createInventoryItem(payload) {
  return apiRequest("/inventory/items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateInventoryItem(
  itemId,
  payload
) {
  return apiRequest(
    `/inventory/items/${itemId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export function deleteInventoryItem(itemId) {
  return apiRequest(
    `/inventory/items/${itemId}`,
    {
      method: "DELETE",
    }
  );
}

/* -------------------------------------------------------------------------- */
/*                                Categories                                  */
/* -------------------------------------------------------------------------- */

export function getInventoryCategories() {
  return apiRequest(
    "/inventory/categories"
  );
}

export function createInventoryCategory(
  payload
) {
  return apiRequest(
    "/inventory/categories",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export function updateInventoryCategory(
  categoryId,
  payload
) {
  return apiRequest(
    `/inventory/categories/${categoryId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export function deleteInventoryCategory(
  categoryId
) {
  return apiRequest(
    `/inventory/categories/${categoryId}`,
    {
      method: "DELETE",
    }
  );
}

/* -------------------------------------------------------------------------- */
/*                          Statistics and reports                            */
/* -------------------------------------------------------------------------- */

export function getInventoryStats(
  params = {}
) {
  return apiRequest(
    `/inventory/items/stats${queryString(params)}`
  );
}

export function getInventoryReports(
  params = {}
) {
  return apiRequest(
    `/inventory/items/reports${queryString(params)}`
  );
}

export function getLowStockItems(
  params = {}
) {
  return apiRequest(
    `/inventory/items/low-stock${queryString(params)}`
  );
}

export function getExpiringInventoryBatches(
  params = {}
) {
  return apiRequest(
    `/inventory/items/expiring${queryString(params)}`
  );
}

/* -------------------------------------------------------------------------- */
/*                              Stock operations                              */
/* -------------------------------------------------------------------------- */

export function adjustInventoryStock(
  itemId,
  payload
) {
  return apiRequest(
    `/inventory/items/${itemId}/adjust-stock`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export function deductInventoryStockFefo(
  itemId,
  payload
) {
  return apiRequest(
    `/inventory/items/${itemId}/deduct-fefo`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Batches                                   */
/* -------------------------------------------------------------------------- */

export function getInventoryBatches(
  itemId,
  params = {}
) {
  return apiRequest(
    `/inventory/items/${itemId}/batches${queryString(params)}`
  );
}

export function createInventoryBatch(
  itemId,
  payload
) {
  return apiRequest(
    `/inventory/items/${itemId}/batches`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export function updateInventoryBatch(
  batchId,
  payload
) {
  return apiRequest(
    `/inventory/batches/${batchId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export function disposeInventoryBatch(
  batchId,
  payload
) {
  return apiRequest(
    `/inventory/batches/${batchId}/dispose`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export function transferInventoryBatch(
  batchId,
  payload
) {
  return apiRequest(
    `/inventory/batches/${batchId}/transfer`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export function mergeInventoryBatches(
  payload
) {
  return apiRequest(
    "/inventory/batches/merge",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

/* -------------------------------------------------------------------------- */
/*                             Stock movements                                */
/* -------------------------------------------------------------------------- */

export function getItemStockMovements(
  itemId,
  params = {}
) {
  return apiRequest(
    `/inventory/items/${itemId}/movements${queryString(params)}`
  );
}

export function getStockMovements(
  params = {}
) {
  return apiRequest(
    `/inventory/movements${queryString(params)}`
  );
}

/* -------------------------------------------------------------------------- */
/*                            Purchase receiving                              */
/* -------------------------------------------------------------------------- */

export function receivePurchaseInventory(
  purchaseId,
  payload
) {
  return apiRequest(
    `/inventory/purchases/${purchaseId}/receive`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

/* -------------------------------------------------------------------------- */
/*                                Bulk import                                 */
/* -------------------------------------------------------------------------- */

export function bulkImportInventoryItems(
  payload
) {
  return apiRequest(
    "/inventory/items/import",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

/* -------------------------------------------------------------------------- */
/*                                 CSV export                                 */
/* -------------------------------------------------------------------------- */

export async function exportInventoryCsv(
  params = {}
) {
  const token =
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token");

  const response = await fetch(
    `${API_BASE_URLS}/inventory/items/export/csv${queryString(params)}`,
    {
      credentials: "include",
      headers: {
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
      },
    }
  );

  if (!response.ok) {
    const payload = await response
      .json()
      .catch(() => null);

    throw new Error(
      payload?.message ||
        "Unable to export inventory records"
    );
  }

  const blob = await response.blob();

  const disposition =
    response.headers.get(
      "content-disposition"
    ) || "";

  const match = disposition.match(
    /filename="?([^"]+)"?/i
  );

  const filename =
    match?.[1] ||
    `inventory-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

  const url = URL.createObjectURL(blob);
  const link =
    document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/* -------------------------------------------------------------------------- */
/*                         Default service object                             */
/* -------------------------------------------------------------------------- */

const inventoryService = {
  getItems: getInventoryItems,
  getItem: getInventoryItemById,
  getItemByBarcode:
    getInventoryItemByBarcode,

  createItem: createInventoryItem,
  updateItem: updateInventoryItem,
  deleteItem: deleteInventoryItem,

  getCategories:
    getInventoryCategories,
  createCategory:
    createInventoryCategory,
  updateCategory:
    updateInventoryCategory,
  deleteCategory:
    deleteInventoryCategory,

  getStats: getInventoryStats,
  getReports: getInventoryReports,
  getLowStock: getLowStockItems,
  getExpiring:
    getExpiringInventoryBatches,

  adjustStock: adjustInventoryStock,
  deductFefo:
    deductInventoryStockFefo,

  getBatches: getInventoryBatches,
  createBatch: createInventoryBatch,
  updateBatch: updateInventoryBatch,
  disposeBatch: disposeInventoryBatch,
  transferBatch: transferInventoryBatch,
  mergeBatches: mergeInventoryBatches,

  getItemMovements:
    getItemStockMovements,
  getMovements: getStockMovements,

  receivePurchase:
    receivePurchaseInventory,

  bulkImport:
    bulkImportInventoryItems,

  exportCsv: exportInventoryCsv,
};

export default inventoryService;