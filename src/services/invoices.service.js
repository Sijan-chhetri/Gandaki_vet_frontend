

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



/**

 * Returns one consistent customer object for both:

 * - registered owners and pets

 * - unregistered walk-in customers

 */

function getInvoiceCustomer(invoice) {

  if (!invoice) {

    return null;

  }



  const appointment =

    invoice.appointment || null;



  const registeredPet =

    invoice.items?.find(

      (item) => item?.pet,

    )?.pet || null;



  const registeredOwnerName =

    invoice.owner

      ? [

          invoice.owner.firstName,

          invoice.owner.lastName,

        ]

          .filter(Boolean)

          .join(" ")

      : "";



  const isWalkIn =

    appointment?.mode === "WALK_IN" ||

    (!invoice.ownerId &&

      !invoice.owner);



  return {

    isWalkIn,



    ownerId:

      invoice.ownerId ||

      invoice.owner?.id ||

      null,



    ownerName:

      registeredOwnerName ||

      invoice.walkInOwnerName ||

      appointment?.walkInOwnerName ||

      "Walk-in customer",



    ownerPhone:

      invoice.owner?.phone ||

      invoice.walkInOwnerPhone ||

      appointment?.walkInOwnerPhone ||

      null,



    ownerEmail:

      invoice.owner?.email ||

      null,



    ownerAddress:

      invoice.owner?.address ||

      invoice.walkInOwnerAddress ||

      appointment?.walkInOwnerAddress ||

      null,



    petId:

      registeredPet?.id ||

      appointment?.petId ||

      null,



    petName:

      registeredPet?.name ||

      invoice.walkInPetName ||

      appointment?.walkInPetName ||

      "Walk-in pet",



    petSpecies:

      registeredPet?.species?.name ||

      invoice.walkInPetSpecies ||

      appointment?.walkInPetSpecies ||

      null,



    petBreed:

      registeredPet?.breed?.name ||

      invoice.walkInPetBreed ||

      appointment?.walkInPetBreed ||

      null,



    petGender:

      registeredPet?.gender ||

      invoice.walkInPetGender ||

      appointment?.walkInPetGender ||

      null,



    petAge:

      invoice.walkInPetAge ||

      appointment?.walkInPetAge ||

      null,



    petWeight:

      invoice.walkInPetWeight ??

      appointment?.walkInPetWeight ??

      null,

  };

}



/**

 * Adds a customer property to one invoice.

 *

 * It does not remove the original owner,

 * appointment or item information.

 */

function normalizeInvoice(invoice) {

  if (!invoice) {

    return invoice;

  }



  return {

    ...invoice,

    customer:

      invoice.customer ||

      getInvoiceCustomer(invoice),

  };

}



/**

 * Normalizes common API response structures.

 */

function normalizeInvoiceResponse(result) {

  if (!result) {

    return result;

  }



  // API returned an array directly.

  if (Array.isArray(result)) {

    return result.map(normalizeInvoice);

  }



  // API returned:

  // { success, data: [...] }

  if (Array.isArray(result.data)) {

    return {

      ...result,

      data: result.data.map(

        normalizeInvoice,

      ),

    };

  }



  // API returned:

  // { success, data: { data: [...] } }

  if (

    result.data &&

    Array.isArray(result.data.data)

  ) {

    return {

      ...result,

      data: {

        ...result.data,

        data: result.data.data.map(

          normalizeInvoice,

        ),

      },

    };

  }



  // API returned one invoice:

  // { success, data: invoice }

  if (

    result.data &&

    typeof result.data === "object"

  ) {

    return {

      ...result,

      data: normalizeInvoice(

        result.data,

      ),

    };

  }



  return normalizeInvoice(result);

}



export async function getInvoices(

  params = {},

) {

  const result = await apiRequest(

    `/invoices${queryString(params)}`,

  );



  return normalizeInvoiceResponse(

    result,

  );

}



export async function createInvoice(

  payload,

) {

  const result = await apiRequest(

    "/invoices",

    {

      method: "POST",

      body: JSON.stringify(payload),

    },

  );



  return normalizeInvoiceResponse(

    result,

  );

}



export async function addInvoiceItem(

  invoiceId,

  payload,

) {

  const result = await apiRequest(

    `/invoices/${invoiceId}/items`,

    {

      method: "POST",

      body: JSON.stringify(payload),

    },

  );



  return normalizeInvoiceResponse(

    result,

  );

}



export async function updateInvoiceItem(

  invoiceId,

  itemId,

  payload,

) {

  const result = await apiRequest(

    `/invoices/${invoiceId}/items/${itemId}`,

    {

      method: "PATCH",

      body: JSON.stringify(payload),

    },

  );



  return normalizeInvoiceResponse(

    result,

  );

}



export async function deleteInvoiceItem(

  invoiceId,

  itemId,

) {

  const result = await apiRequest(

    `/invoices/${invoiceId}/items/${itemId}`,

    {

      method: "DELETE",

    },

  );



  return normalizeInvoiceResponse(

    result,

  );

}



export function getOwners(

  params = {},

) {

  return apiRequest(

    `/owners${queryString(params)}`,

  );

}



export function getOwnerPets(

  ownerId,

  params = {},

) {

  return apiRequest(

    `/owners/${ownerId}/pets${queryString(

      params,

    )}`,

  );

}



export function getInventoryItems(

  params = {},

) {

  return apiRequest(

    `/inventory/items${queryString(

      params,

    )}`,

  );

}



export function getInvoiceStats(

  params = {},

) {

  return apiRequest(

    `/invoices/stats${queryString(

      params,

    )}`,

  );

}



export async function getOverdueInvoices(

  params = {},

) {

  const result = await apiRequest(

    `/invoices/overdue${queryString(

      params,

    )}`,

  );



  return normalizeInvoiceResponse(

    result,

  );

}



export async function getInvoiceById(

  invoiceId,

) {

  const result = await apiRequest(

    `/invoices/${invoiceId}`,

  );



  return normalizeInvoiceResponse(

    result,

  );

}



export async function getPrintableInvoice(

  invoiceId,

) {

  const result = await apiRequest(

    `/invoices/${invoiceId}/print`,

  );



  if (

    result?.data?.invoice

  ) {

    return {

      ...result,

      data: {

        ...result.data,

        invoice: normalizeInvoice(

          result.data.invoice,

        ),



        print: {

          ...result.data.print,



          ownerName:

            result.data.print

              ?.ownerName ||

            getInvoiceCustomer(

              result.data.invoice,

            )?.ownerName,



          ownerPhone:

            result.data.print

              ?.ownerPhone ||

            getInvoiceCustomer(

              result.data.invoice,

            )?.ownerPhone,



          ownerAddress:

            result.data.print

              ?.ownerAddress ||

            getInvoiceCustomer(

              result.data.invoice,

            )?.ownerAddress,



          petName:

            result.data.print

              ?.petName ||

            getInvoiceCustomer(

              result.data.invoice,

            )?.petName,



          petSpecies:

            result.data.print

              ?.petSpecies ||

            getInvoiceCustomer(

              result.data.invoice,

            )?.petSpecies,



          petBreed:

            result.data.print

              ?.petBreed ||

            getInvoiceCustomer(

              result.data.invoice,

            )?.petBreed,

        },

      },

    };

  }



  return normalizeInvoiceResponse(

    result,

  );

}



export async function updateInvoice(

  invoiceId,

  payload,

) {

  const result = await apiRequest(

    `/invoices/${invoiceId}`,

    {

      method: "PATCH",

      body: JSON.stringify(payload),

    },

  );



  return normalizeInvoiceResponse(

    result,

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



export async function issueInvoice(

  invoiceId,

) {

  const result = await apiRequest(

    `/invoices/${invoiceId}/issue`,

    {

      method: "POST",

    },

  );



  return normalizeInvoiceResponse(

    result,

  );

}



export async function voidInvoice(

  invoiceId,

  payload = {},

) {

  const result = await apiRequest(

    `/invoices/${invoiceId}/void`,

    {

      method: "POST",

      body: JSON.stringify(payload),

    },

  );



  return normalizeInvoiceResponse(

    result,

  );

}



export async function recordInvoicePayment(

  invoiceId,

  payload,

) {

  const result = await apiRequest(

    `/invoices/${invoiceId}/payments`,

    {

      method: "POST",

      body: JSON.stringify(payload),

    },

  );



  if (

    result?.data?.invoice

  ) {

    return {

      ...result,

      data: {

        ...result.data,

        invoice: normalizeInvoice(

          result.data.invoice,

        ),

      },

    };

  }



  return result;

}



export function getInvoicePayments(

  invoiceId,

) {

  return apiRequest(

    `/invoices/${invoiceId}/payments`,

  );

}



export async function refundInvoicePayment(

  invoiceId,

  paymentId,

  payload = {},

) {

  const result = await apiRequest(

    `/invoices/${invoiceId}/payments/${paymentId}/refund`,

    {

      method: "POST",

      body: JSON.stringify(payload),

    },

  );



  if (

    result?.data?.invoice

  ) {

    return {

      ...result,

      data: {

        ...result.data,

        invoice: normalizeInvoice(

          result.data.invoice,

        ),

      },

    };

  }



  return result;

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



  const blob =

    await response.blob();



  const disposition =

    response.headers.get(

      "content-disposition",

    ) || "";



  const match =

    disposition.match(

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



  addItem:

    addInvoiceItem,



  updateItem:

    updateInvoiceItem,



  deleteItem:

    deleteInvoiceItem,



  getOwners,

  getOwnerPets,

  getInventoryItems,



  getStats:

    getInvoiceStats,



  getOverdue:

    getOverdueInvoices,



  getInvoice:

    getInvoiceById,



  getPrintable:

    getPrintableInvoice,



  updateInvoice,



  deleteDraft:

    deleteDraftInvoice,



  issue:

    issueInvoice,



  void:

    voidInvoice,



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



  // Optional helpers for direct frontend use

  normalizeInvoice,

  getInvoiceCustomer,

};



export default invoiceService;



