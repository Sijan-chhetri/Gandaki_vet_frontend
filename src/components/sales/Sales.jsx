import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  FileCheck2,
  CreditCard,
  FileText,
  LoaderCircle,
  Package,
  Plus,
  Printer,
  ShoppingCart,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Undo2,
  WalletCards,
  X,
} from "lucide-react";

import invoiceService from "../../services/invoices.service.js";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import "./sales.css";

const INVOICE_STATUSES = [
  "DRAFT",
  "ISSUED",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "VOID",
];

const MANAGE_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "RECEPTIONIST",
  "CASHIER",
];

const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
];

const normalizeRole = (role) =>
  String(role || "")
    .trim()
    .replaceAll("-", "_")
    .replaceAll(" ", "_")
    .toUpperCase();

const getStoredRole = () => {
  try {
    const user = JSON.parse(
      localStorage.getItem("user") ||
      "null",
    );

    return normalizeRole(
      user?.role ||
      user?.userRole ||
      user?.data?.role ||
      user?.user?.role,
    );
  } catch {
    return "";
  }
};

const money = (
  value,
  currency = "NPR",
) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const dateText = (value) =>
  value
    ? new Date(value).toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      },
    )
    : "—";

const dateTimeText = (value) =>
  value
    ? new Date(value).toLocaleString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    )
    : "—";

const displayStatus = (value = "") =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    );

const statusClass = (status) => {
  const map = {
    DRAFT: "text-bg-secondary",
    ISSUED: "text-bg-primary",
    PARTIALLY_PAID:
      "text-bg-warning",
    PAID: "text-bg-success",
    OVERDUE: "text-bg-danger",
    VOID: "text-bg-dark",
  };

  return (
    map[status] ||
    "text-bg-secondary"
  );
};

const ownerName = (owner) =>
  [owner?.firstName, owner?.lastName]
    .filter(Boolean)
    .join(" ") || "Unknown owner";

const getPetNames = (invoice) => {
  const values = [
    ...new Set(
      (invoice.items || [])
        .map((item) => item.pet?.name)
        .filter(Boolean),
    ),
  ];

  return values.join(", ") || "—";
};

const emptyRetailLine = () => ({
  key: `${Date.now()}-${Math.random()}`,
  inventoryItemId: "",
  petId: "",
  quantity: 1,
  discountAmount: 0,
});

const emptyRetailForm = () => ({
  ownerId: "",
  dueAt: "",
  notes: "",
  discountAmount: 0,
  issueImmediately: false,
  items: [emptyRetailLine()],
});

const emptyPaymentForm = () => ({
  paymentMethodId: "",
  amount: "",
  paidAt: new Date()
    .toISOString()
    .slice(0, 16),
  transactionRef: "",
  notes: "",
});

function Sales() {
  const userRole = getStoredRole();
  const canManage =
    MANAGE_ROLES.includes(userRole);
  const canAdmin =
    ADMIN_ROLES.includes(userRole);

  const [invoices, setInvoices] =
    useState([]);
  const [stats, setStats] =
    useState(null);
  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
    });

  const [filters, setFilters] =
    useState({
      search: "",
      status: "",
      dateFrom: "",
      dateTo: "",
    });

  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [error, setError] =
    useState("");
  const [success, setSuccess] =
    useState("");

  const [selectedInvoice, setSelectedInvoice] =
    useState(null);

  const [selectedInvoiceLoading, setSelectedInvoiceLoading] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState("");

  const [addItemsInvoice, setAddItemsInvoice] =
    useState(null);

  const [showInlineItems, setShowInlineItems] =
    useState(false);

  const [addItemsLines, setAddItemsLines] =
    useState([emptyRetailLine()]);

  const [pdfPreview, setPdfPreview] =
    useState(null);

  const [pdfLoading, setPdfLoading] =
    useState(false);

  const [showRetailModal, setShowRetailModal] =
    useState(false);
  const [retailForm, setRetailForm] =
    useState(emptyRetailForm());
  const [owners, setOwners] =
    useState([]);
  const [ownerSearch, setOwnerSearch] =
    useState("");
  const [pets, setPets] =
    useState([]);
  const [inventoryItems, setInventoryItems] =
    useState([]);
  const [inventorySearch, setInventorySearch] =
    useState("");

  const [paymentMethods, setPaymentMethods] =
    useState([]);
  const [paymentInvoice, setPaymentInvoice] =
    useState(null);
  const [paymentForm, setPaymentForm] =
    useState(emptyPaymentForm());

  const [refundTarget, setRefundTarget] =
    useState(null);
  const [refundReason, setRefundReason] =
    useState("");

  const loadInvoices = useCallback(
    async (page = 1) => {
      const response =
        await invoiceService.getInvoices({
          page,
          limit: pagination.limit,
          search:
            filters.search.trim(),
          status: filters.status,
          dateFrom:
            filters.dateFrom,
          dateTo:
            filters.dateTo,
          sortBy: "createdAt",
          sortOrder: "desc",
        });

      setInvoices(response.data || []);
      setPagination((previous) => ({
        ...previous,
        ...(response.pagination || {}),
      }));
    },
    [
      filters,
      pagination.limit,
    ],
  );

  const loadStats = useCallback(
    async () => {
      const response =
        await invoiceService.getStats({
          dateFrom:
            filters.dateFrom,
          dateTo:
            filters.dateTo,
        });

      setStats(response.data || null);
    },
    [
      filters.dateFrom,
      filters.dateTo,
    ],
  );

  const loadPaymentMethods =
    useCallback(async () => {
      if (!canManage) return;

      try {
        const response =
          await invoiceService
            .getPaymentMethods();

        setPaymentMethods(
          response.data || [],
        );
      } catch (requestError) {
        console.error(requestError);
      }
    }, [canManage]);

  const reload = useCallback(
    async (page = pagination.page) => {
      try {
        setLoading(true);
        setError("");

        await Promise.all([
          loadInvoices(page),
          loadStats(),
          loadPaymentMethods(),
        ]);
      } catch (requestError) {
        setError(
          requestError.message ||
          "Unable to load invoices.",
        );
      } finally {
        setLoading(false);
      }
    },
    [
      loadInvoices,
      loadStats,
      loadPaymentMethods,
      pagination.page,
    ],
  );

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => reload(1),
        300,
      );

    return () =>
      window.clearTimeout(timer);
  }, [
    filters.search,
    filters.status,
    filters.dateFrom,
    filters.dateTo,
  ]);

  useEffect(() => {
    if (!showRetailModal) return;

    const timer =
      window.setTimeout(
        async () => {
          try {
            const response =
              await invoiceService.getOwners({
                search:
                  ownerSearch.trim(),
                limit: 30,
                page: 1,
              });

            setOwners(
              response.data || [],
            );
          } catch (requestError) {
            setError(
              requestError.message ||
              "Unable to load owners.",
            );
          }
        },
        250,
      );

    return () =>
      window.clearTimeout(timer);
  }, [
    showRetailModal,
    ownerSearch,
  ]);

  useEffect(() => {
    if (!showRetailModal && !addItemsInvoice) {
      return;
    }

    const timer = window.setTimeout(
      async () => {
        try {
          const response =
            await invoiceService.getInventoryItems({
              search: inventorySearch.trim(),
              limit: 100,
              page: 1,
              isActive: true,
            });

          console.log(
            "Inventory API response:",
            response,
          );

          const items =
            Array.isArray(response?.data)
              ? response.data
              : Array.isArray(
                response?.data?.items,
              )
                ? response.data.items
                : Array.isArray(
                  response?.items,
                )
                  ? response.items
                  : [];

          setInventoryItems(items);
        } catch (requestError) {
          console.error(
            "Inventory loading error:",
            requestError,
          );

          setInventoryItems([]);

          setError(
            requestError.message ||
            "Unable to load inventory.",
          );
        }
      },
      250,
    );

    return () =>
      window.clearTimeout(timer);
  }, [
    showRetailModal,
    addItemsInvoice,
    inventorySearch,
  ]);

useEffect(() => {
  const loadPets = async () => {
    if (!retailForm.ownerId) {
      setPets([]);
      return;
    }

    try {
      const response =
        await invoiceService.getOwnerPets(
          retailForm.ownerId,
          {
            limit: 100,
            page: 1,
          },
        );

      console.log(
        "Owner pets API response:",
        response,
      );

      const petList =
        Array.isArray(response?.data)
          ? response.data
          : Array.isArray(
                response?.data?.pets,
              )
            ? response.data.pets
            : Array.isArray(
                  response?.data?.items,
                )
              ? response.data.items
              : Array.isArray(
                    response?.pets,
                  )
                ? response.pets
                : [];

      setPets(petList);
    } catch (requestError) {
      console.error(
        "Unable to load owner pets:",
        requestError,
      );

      setPets([]);

      setError(
        requestError.message ||
          "Unable to load owner pets.",
      );
    }
  };

  loadPets();
}, [retailForm.ownerId]);

  const retailSubtotal = useMemo(
    () =>
      retailForm.items.reduce(
        (sum, line) => {
          const item =
            inventoryItems.find(
              (entry) =>
                entry.id ===
                line.inventoryItemId,
            );

          return (
            sum +
            Number(line.quantity || 0) *
            Number(
              item?.sellingPrice || 0,
            )
          );
        },
        0,
      ),
    [
      retailForm.items,
      inventoryItems,
    ],
  );

  const retailTax = useMemo(
    () =>
      retailForm.items.reduce(
        (sum, line) => {
          const item =
            inventoryItems.find(
              (entry) =>
                entry.id ===
                line.inventoryItemId,
            );

          const gross =
            Number(line.quantity || 0) *
            Number(
              item?.sellingPrice || 0,
            );

          const discount =
            Number(
              line.discountAmount || 0,
            );

          return (
            sum +
            Math.max(
              gross - discount,
              0,
            ) *
            (Number(
              item?.taxPercent || 0,
            ) /
              100)
          );
        },
        0,
      ),
    [
      retailForm.items,
      inventoryItems,
    ],
  );

  const retailTotal =
    Math.max(
      retailSubtotal -
      retailForm.items.reduce(
        (sum, line) =>
          sum +
          Number(
            line.discountAmount || 0,
          ),
        0,
      ) -
      Number(
        retailForm.discountAmount || 0,
      ) +
      retailTax,
      0,
    );

  const openRetailInvoice = () => {
    setRetailForm(emptyRetailForm());
    setOwnerSearch("");
    setInventorySearch("");
    setPets([]);
    setError("");
    setShowRetailModal(true);
  };

  const changeRetailLine = (
    key,
    field,
    value,
  ) => {
    setRetailForm((previous) => ({
      ...previous,
      items: previous.items.map(
        (line) =>
          line.key === key
            ? {
              ...line,
              [field]: value,
            }
            : line,
      ),
    }));
  };

  const addRetailLine = () => {
    setRetailForm((previous) => ({
      ...previous,
      items: [
        ...previous.items,
        emptyRetailLine(),
      ],
    }));
  };

  const removeRetailLine = (key) => {
    setRetailForm((previous) => ({
      ...previous,
      items:
        previous.items.length === 1
          ? previous.items
          : previous.items.filter(
            (line) =>
              line.key !== key,
          ),
    }));
  };

  const submitRetailInvoice = async (
    event,
  ) => {
    event.preventDefault();

    if (!retailForm.ownerId) {
      setError(
        "Select the pet owner or customer.",
      );
      return;
    }

    const validLines =
      retailForm.items.filter(
        (line) =>
          line.inventoryItemId &&
          Number(line.quantity) > 0,
      );

    if (!validLines.length) {
      setError(
        "Add at least one inventory item.",
      );
      return;
    }

    for (const line of validLines) {
      const item =
        inventoryItems.find(
          (entry) =>
            entry.id ===
            line.inventoryItemId,
        );

      if (
        item &&
        Number(line.quantity) >
        Number(item.currentStock)
      ) {
        setError(
          `${item.name} has only ${item.currentStock} ${item.unit || "units"} in stock.`,
        );
        return;
      }
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response =
        await invoiceService.createInvoice({
          ownerId:
            retailForm.ownerId,
          dueAt:
            retailForm.dueAt ||
            null,
          notes:
            retailForm.notes.trim() ||
            "Retail inventory sale from Pokhara Pet House",
          discountAmount:
            Number(
              retailForm.discountAmount ||
              0,
            ),
          items: validLines.map(
            (line) => ({
              inventoryItemId:
                line.inventoryItemId,
              petId:
                line.petId || null,
              quantity:
                Number(line.quantity),
              discountAmount:
                Number(
                  line.discountAmount ||
                  0,
                ),
            }),
          ),
        });

      const invoice =
        response.data;

      if (
        retailForm.issueImmediately
      ) {
        await invoiceService.issue(
          invoice.id,
        );
      }

      setShowRetailModal(false);
      setSuccess(
        retailForm.issueImmediately
          ? "Retail invoice created and issued. Inventory stock was deducted."
          : "Retail draft invoice created successfully.",
      );

      await reload(1);
    } catch (requestError) {
      setError(
        requestError.message ||
        "Unable to create retail invoice.",
      );
    } finally {
      setSaving(false);
    }
  };

  const openInvoice = async (
    invoiceId,
  ) => {
    try {
      setError("");
      setSelectedInvoiceLoading(true);

      const response =
        await invoiceService.getInvoice(
          invoiceId,
        );

      setSelectedInvoice(
        response.data,
      );

      setShowInlineItems(false);
      setAddItemsInvoice(null);
    } catch (requestError) {
      setError(
        requestError.message ||
        "Unable to load invoice.",
      );
    } finally {
      setSelectedInvoiceLoading(false);
    }
  };

  const refreshSelectedInvoice =
    async (invoiceId) => {
      const response =
        await invoiceService.getInvoice(
          invoiceId,
        );

      setSelectedInvoice(
        response.data,
      );
    };

  const openAddInventoryItems = (
    invoice,
  ) => {
    if (invoice.status !== "DRAFT") {
      setError(
        "Items can only be added to a draft invoice.",
      );
      return;
    }

    setError("");
    setInventorySearch("");
    setInventoryItems([]);
    setAddItemsLines([
      emptyRetailLine(),
    ]);

    // This causes the inventory-loading
    // useEffect to run.
    setAddItemsInvoice(invoice);
    setShowInlineItems(true);
  };
  const changeAddItemLine = (
    key,
    field,
    value,
  ) => {
    setAddItemsLines((previous) =>
      previous.map((line) =>
        line.key === key
          ? {
            ...line,
            [field]: value,
          }
          : line,
      ),
    );
  };

  const addSelectedInvoiceLine = () => {
    setAddItemsLines((previous) => [
      ...previous,
      emptyRetailLine(),
    ]);
  };

  const addInventoryProductToInvoice = (
    inventoryItem,
  ) => {
    if (
      Number(inventoryItem.currentStock) <=
      0
    ) {
      setError(
        `${inventoryItem.name} is out of stock.`,
      );
      return;
    }

    setAddItemsLines((previous) => {
      const existing =
        previous.find(
          (line) =>
            line.inventoryItemId ===
            inventoryItem.id,
        );

      if (existing) {
        return previous.map((line) =>
          line.key === existing.key
            ? {
              ...line,
              quantity:
                Number(
                  line.quantity || 0,
                ) + 1,
            }
            : line,
        );
      }

      const emptyOnly =
        previous.length === 1 &&
        !previous[0].inventoryItemId;

      const newLine = {
        ...emptyRetailLine(),
        inventoryItemId:
          inventoryItem.id,
      };

      return emptyOnly
        ? [newLine]
        : [...previous, newLine];
    });
  };

  const removeSelectedInvoiceLine = (
    key,
  ) => {
    setAddItemsLines((previous) =>
      previous.length === 1
        ? previous
        : previous.filter(
          (line) =>
            line.key !== key,
        ),
    );
  };

  const submitSelectedInvoiceItems =
    async (event) => {
      event.preventDefault();

      const validLines =
        addItemsLines.filter(
          (line) =>
            line.inventoryItemId &&
            Number(line.quantity) > 0,
        );

      if (!validLines.length) {
        setError(
          "Select at least one inventory item.",
        );
        return;
      }

      for (const line of validLines) {
        const inventoryItem =
          inventoryItems.find(
            (item) =>
              item.id ===
              line.inventoryItemId,
          );

        if (
          inventoryItem &&
          Number(line.quantity) >
          Number(
            inventoryItem.currentStock,
          )
        ) {
          setError(
            `${inventoryItem.name} has only ${inventoryItem.currentStock} ${inventoryItem.unit || "units"} available.`,
          );
          return;
        }
      }

      try {
        setSaving(true);
        setActionLoading(
          "add-items",
        );
        setError("");

        for (const line of validLines) {
          await invoiceService.addItem(
            addItemsInvoice.id,
            {
              inventoryItemId:
                line.inventoryItemId,
              petId:
                line.petId || null,
              quantity:
                Number(line.quantity),
              discountAmount:
                Number(
                  line.discountAmount ||
                  0,
                ),
            },
          );
        }

        const response =
          await invoiceService.getInvoice(
            addItemsInvoice.id,
          );

        setSelectedInvoice(
          response.data,
        );

        setAddItemsInvoice(null);
        setShowInlineItems(false);
        setAddItemsLines([
          emptyRetailLine(),
        ]);

        setSuccess(
          "Inventory items added to the draft invoice.",
        );

        await reload(
          pagination.page,
        );
      } catch (requestError) {
        setError(
          requestError.message ||
          "Unable to add inventory items.",
        );
      } finally {
        setSaving(false);
        setActionLoading("");
      }
    };

  const createInvoicePdf = (
    invoice,
  ) => {
    const currency =
      invoice.clinic?.currency ||
      "NPR";

    const document = new jsPDF({
      unit: "mm",
      format: "a4",
    });

    const clinicName =
      invoice.clinic?.name ||
      "Pokhara Pet House";

    document.setFontSize(20);
    document.setFont(
      "helvetica",
      "bold",
    );
    document.text(
      clinicName,
      14,
      18,
    );

    document.setFontSize(10);
    document.setFont(
      "helvetica",
      "normal",
    );
    document.text(
      "Veterinary Clinic & Pet Supplies",
      14,
      24,
    );

    if (invoice.clinic?.address) {
      document.text(
        invoice.clinic.address,
        14,
        29,
      );
    }

    if (invoice.clinic?.phone) {
      document.text(
        `Phone: ${invoice.clinic.phone}`,
        14,
        34,
      );
    }

    document.setFontSize(16);
    document.setFont(
      "helvetica",
      "bold",
    );
    document.text(
      "INVOICE",
      196,
      18,
      {
        align: "right",
      },
    );

    document.setFontSize(10);
    document.setFont(
      "helvetica",
      "normal",
    );

    document.text(
      invoice.invoiceNumber,
      196,
      24,
      {
        align: "right",
      },
    );

    document.text(
      dateText(invoice.createdAt),
      196,
      29,
      {
        align: "right",
      },
    );

    document.text(
      `Status: ${displayStatus(
        invoice.status,
      )}`,
      196,
      34,
      {
        align: "right",
      },
    );

    document.setDrawColor(210);
    document.line(
      14,
      40,
      196,
      40,
    );

    document.setFont(
      "helvetica",
      "bold",
    );
    document.text(
      "Bill to",
      14,
      48,
    );

    document.setFont(
      "helvetica",
      "normal",
    );
    document.text(
      ownerName(invoice.owner),
      14,
      54,
    );

    if (invoice.owner?.phone) {
      document.text(
        invoice.owner.phone,
        14,
        59,
      );
    }

    if (invoice.owner?.address) {
      const address =
        document.splitTextToSize(
          invoice.owner.address,
          85,
        );

      document.text(
        address,
        14,
        64,
      );
    }

    const rows = (
      invoice.items || []
    ).map((item) => [
      item.description,
      item.pet?.name || "—",
      Number(item.quantity),
      money(
        item.unitPrice,
        currency,
      ),
      money(
        item.discountAmount,
        currency,
      ),
      money(
        item.taxAmount,
        currency,
      ),
      money(
        item.lineTotal,
        currency,
      ),
    ]);

    autoTable(document, {
      startY: 76,
      head: [[
        "Description",
        "Pet",
        "Qty",
        "Price",
        "Discount",
        "Tax",
        "Total",
      ]],
      body: rows,
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
      },
      headStyles: {
        fontStyle: "bold",
      },
      columnStyles: {
        0: {
          cellWidth: 46,
        },
        1: {
          cellWidth: 20,
        },
        2: {
          halign: "right",
        },
        3: {
          halign: "right",
        },
        4: {
          halign: "right",
        },
        5: {
          halign: "right",
        },
        6: {
          halign: "right",
        },
      },
    });

    const finalY =
      document.lastAutoTable
        ?.finalY || 90;

    const totalsX = 126;
    let totalsY = finalY + 10;

    const drawTotal = (
      label,
      value,
      bold = false,
    ) => {
      document.setFont(
        "helvetica",
        bold
          ? "bold"
          : "normal",
      );

      document.text(
        label,
        totalsX,
        totalsY,
      );

      document.text(
        value,
        196,
        totalsY,
        {
          align: "right",
        },
      );

      totalsY += 6;
    };

    drawTotal(
      "Subtotal",
      money(
        invoice.subtotal,
        currency,
      ),
    );

    drawTotal(
      "Discount",
      money(
        invoice.discountAmount,
        currency,
      ),
    );

    drawTotal(
      "Tax",
      money(
        invoice.taxAmount,
        currency,
      ),
    );

    document.line(
      totalsX,
      totalsY - 2,
      196,
      totalsY - 2,
    );

    drawTotal(
      "Total",
      money(
        invoice.totalAmount,
        currency,
      ),
      true,
    );

    drawTotal(
      "Paid",
      money(
        invoice.paidAmount,
        currency,
      ),
    );

    drawTotal(
      "Balance",
      money(
        invoice.balanceAmount,
        currency,
      ),
      true,
    );

    if (invoice.notes) {
      const noteY =
        Math.min(
          totalsY + 8,
          270,
        );

      document.setFont(
        "helvetica",
        "bold",
      );
      document.text(
        "Notes",
        14,
        noteY,
      );

      document.setFont(
        "helvetica",
        "normal",
      );

      document.text(
        document.splitTextToSize(
          invoice.notes,
          175,
        ),
        14,
        noteY + 6,
      );
    }

    return document;
  };

  const openPdfPreview = async (
    invoice,
  ) => {
    try {
      setPdfLoading(true);
      setActionLoading("pdf");
      setError("");

      const response =
        await invoiceService.getInvoice(
          invoice.id,
        );

      const fullInvoice =
        response.data;

      const document =
        createInvoicePdf(
          fullInvoice,
        );

      const blob =
        document.output("blob");

      const url =
        URL.createObjectURL(blob);

      setPdfPreview({
        url,
        invoice:
          fullInvoice,
        filename:
          `${fullInvoice.invoiceNumber}.pdf`,
      });
    } catch (requestError) {
      setError(
        requestError.message ||
        "Unable to generate PDF preview.",
      );
    } finally {
      setPdfLoading(false);
      setActionLoading("");
    }
  };

  const closePdfPreview = () => {
    if (pdfPreview?.url) {
      URL.revokeObjectURL(
        pdfPreview.url,
      );
    }

    setPdfPreview(null);
  };

  const downloadPdf = () => {
    if (!pdfPreview) return;

    const link =
      document.createElement("a");

    link.href =
      pdfPreview.url;

    link.download =
      pdfPreview.filename;

    document.body.appendChild(
      link,
    );

    link.click();

    document.body.removeChild(
      link,
    );
  };

  const handleIssue = async (invoice) => {
    const confirmed = window.confirm(
      `Issue invoice ${invoice.invoiceNumber}? Inventory items will be deducted from stock.`,
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setActionLoading("issue");
      setError("");
      setSuccess("");

      await invoiceService.issue(invoice.id);

      /*
       * Fetch the invoice again because the backend has now:
       * 1. Changed the status to ISSUED
       * 2. Deducted inventory stock
       * 3. Recalculated the balance
       */
      const invoiceResponse =
        await invoiceService.getInvoice(
          invoice.id,
        );

      const issuedInvoice =
        invoiceResponse.data;

      // setSelectedInvoice(issuedInvoice);
      setSelectedInvoice(null);

      setShowInlineItems(false);
      setAddItemsInvoice(null);

      setSuccess(
        `Invoice ${issuedInvoice.invoiceNumber} was issued successfully. Record the customer payment below.`,
      );

      /*
       * Automatically open payment modal.
       */
      openPayment(issuedInvoice);

      await reload(pagination.page);
    } catch (requestError) {
      setError(
        requestError.message ||
        "Unable to issue invoice.",
      );
    } finally {
      setSaving(false);
      setActionLoading("");
    }
  };

  const handleDeleteDraft = async (
    invoice,
  ) => {
    if (
      !window.confirm(
        `Delete draft ${invoice.invoiceNumber}?`,
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      setActionLoading("delete");
      await invoiceService.deleteDraft(
        invoice.id,
      );

      if (
        selectedInvoice?.id ===
        invoice.id
      ) {
        setSelectedInvoice(null);
      }

      setSuccess(
        "Draft invoice deleted.",
      );
      await reload(1);
    } catch (requestError) {
      setError(
        requestError.message ||
        "Unable to delete invoice.",
      );
    } finally {
      setSaving(false);
      setActionLoading("");
    }
  };

  const handleVoid = async (
    invoice,
  ) => {
    const reason =
      window.prompt(
        `Reason for voiding ${invoice.invoiceNumber}:`,
      );

    if (reason === null) return;

    try {
      setSaving(true);
      setActionLoading("void");
      await invoiceService.void(
        invoice.id,
        {
          reason:
            reason.trim() ||
            "Invoice voided",
        },
      );

      setSuccess(
        "Invoice voided. Inventory stock was restored where applicable.",
      );

      if (
        selectedInvoice?.id ===
        invoice.id
      ) {
        await refreshSelectedInvoice(
          invoice.id,
        );
      }

      await reload();
    } catch (requestError) {
      setError(
        requestError.message ||
        "Unable to void invoice.",
      );
    } finally {
      setSaving(false);
      setActionLoading("");
    }
  };

  const openPayment = (invoice) => {
    if (!invoice) return;

    const balance =
      Number(invoice.balanceAmount || 0);

    if (balance <= 0) {
      setError(
        "This invoice has no outstanding balance.",
      );
      return;
    }

    setError("");

    setPaymentInvoice(invoice);

    setPaymentForm({
      ...emptyPaymentForm(),
      amount: balance.toFixed(2),
      paymentMethodId:
        paymentMethods[0]?.id || "",
    });
  };

  const submitPayment = async (event) => {
    event.preventDefault();

    if (!paymentInvoice) return;

    const currentInvoice =
      paymentInvoice;

    const amount =
      Number(paymentForm.amount);

    const balance =
      Number(
        currentInvoice.balanceAmount,
      );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError(
        "Enter a valid payment amount.",
      );
      return;
    }

    if (amount > balance) {
      setError(
        `Payment cannot exceed the outstanding balance of ${money(
          balance,
          currentInvoice.clinic
            ?.currency || "NPR",
        )}.`,
      );
      return;
    }

    if (!paymentForm.paymentMethodId) {
      setError(
        "Select a payment method.",
      );
      return;
    }

    try {
      setSaving(true);
      setActionLoading("payment");
      setError("");
      setSuccess("");

      await invoiceService.recordPayment(
        currentInvoice.id,
        {
          paymentMethodId:
            paymentForm.paymentMethodId,

          amount,

          paidAt:
            paymentForm.paidAt || null,

          transactionRef:
            paymentForm.transactionRef
              .trim() || null,

          notes:
            paymentForm.notes.trim() ||
            null,
        },
      );

      const invoiceResponse =
        await invoiceService.getInvoice(
          currentInvoice.id,
        );

      const updatedInvoice =
        invoiceResponse.data;

      setPaymentInvoice(null);
      setPaymentForm(
        emptyPaymentForm(),
      );

      setSuccess(
        Number(updatedInvoice.balanceAmount) ===
          0
          ? `Full payment recorded. Invoice ${updatedInvoice.invoiceNumber} is now paid.`
          : `Partial payment recorded. Remaining balance: ${money(
            updatedInvoice.balanceAmount,
            updatedInvoice.clinic
              ?.currency || "NPR",
          )}.`,
      );

      /*
       * Reopen updated invoice details so the user
       * immediately sees PAID or PARTIALLY PAID.
       */
      setSelectedInvoice(updatedInvoice);

      await reload(pagination.page);
    } catch (requestError) {
      setError(
        requestError.message ||
        "Unable to record payment.",
      );
    } finally {
      setSaving(false);
      setActionLoading("");
    }
  };

  const submitRefund = async (
    event,
  ) => {
    event.preventDefault();

    try {
      setSaving(true);

      await invoiceService.refundPayment(
        refundTarget.invoiceId,
        refundTarget.payment.id,
        {
          reason:
            refundReason.trim() ||
            "Payment refunded",
        },
      );

      await refreshSelectedInvoice(
        refundTarget.invoiceId,
      );

      setRefundTarget(null);
      setRefundReason("");
      setSuccess(
        "Payment refunded successfully.",
      );
      await reload();
    } catch (requestError) {
      setError(
        requestError.message ||
        "Unable to refund payment.",
      );
    } finally {
      setSaving(false);
    }
  };

  const printInvoice = async (
    invoiceId,
  ) => {
    try {
      const response =
        await invoiceService.getPrintable(
          invoiceId,
        );

      const invoice =
        response.data.invoice;
      const currency =
        response.data.print.currency ||
        "NPR";

      const printWindow =
        window.open(
          "",
          "_blank",
          "width=950,height=800",
        );

      if (!printWindow) {
        throw new Error(
          "Allow pop-ups to print the invoice.",
        );
      }

      printWindow.document.write(
        buildPrintHtml(
          invoice,
          currency,
        ),
      );

      printWindow.document.close();
      printWindow.focus();

      window.setTimeout(
        () => printWindow.print(),
        250,
      );
    } catch (requestError) {
      setError(
        requestError.message ||
        "Unable to print invoice.",
      );
    }
  };

  const totalPaid =
    stats?.totals?.paid || 0;
  const totalOutstanding =
    stats?.totals?.outstanding || 0;
  const totalInvoiced =
    stats?.totals?.invoiced || 0;
  const totalInvoices =
    Object.values(
      stats?.byStatus || {},
    ).reduce(
      (sum, value) =>
        sum +
        Number(value.count || 0),
      0,
    );

  return (
    <div className="container-fluid py-3 py-md-4 sales-page">
      {(saving ||
        selectedInvoiceLoading ||
        pdfLoading) && (
          <LoadingOverlay
            label={
              actionLoading === "payment"
                ? "Recording payment..."
                : actionLoading === "add-items"
                  ? "Adding inventory items..."
                  : actionLoading === "issue"
                    ? "Issuing invoice..."
                    : actionLoading === "delete"
                      ? "Deleting draft..."
                      : actionLoading === "void"
                        ? "Voiding invoice..."
                        : actionLoading === "pdf"
                          ? "Preparing PDF..."
                          : selectedInvoiceLoading
                            ? "Loading invoice..."
                            : "Processing..."
            }
          />
        )}
      <div className="d-flex flex-column flex-xl-row justify-content-between align-items-xl-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            Sales &amp; Invoices
          </h3>

          <p className="text-secondary mb-0">
            Create appointment bills and
            retail inventory invoices for
            Pokhara Pet House.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-light border d-flex align-items-center gap-2"
            onClick={() =>
              reload(pagination.page)
            }
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          {canManage && (
            <>
              <button
                type="button"
                className="btn btn-light border d-flex align-items-center gap-2"
                onClick={() =>
                  invoiceService
                    .exportCsv(filters)
                    .catch(
                      (requestError) =>
                        setError(
                          requestError.message,
                        ),
                    )
                }
              >
                <Download size={17} />
                Export
              </button>

              <button
                type="button"
                className="btn btn-primary d-flex align-items-center gap-2"
                onClick={openRetailInvoice}
              >
                <Plus size={17} />
                New retail invoice
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <AlertMessage
          type="danger"
          message={error}
          onClose={() => setError("")}
        />
      )}

      {success && (
        <AlertMessage
          type="success"
          message={success}
          onClose={() =>
            setSuccess("")
          }
        />
      )}

      <div className="row g-3 mb-4">
        <SummaryCard
          label="Total invoiced"
          value={money(totalInvoiced)}
          icon={ReceiptText}
        />

        <SummaryCard
          label="Payments received"
          value={money(totalPaid)}
          icon={Banknote}
        />

        <SummaryCard
          label="Outstanding"
          value={money(
            totalOutstanding,
          )}
          icon={WalletCards}
        />

        <SummaryCard
          label="Total invoices"
          value={totalInvoices}
          icon={Package}
        />
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-4">
          <div className="row g-3">
            <div className="col-lg-4">
              <label className="form-label small fw-semibold">
                Search
              </label>

              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <Search size={17} />
                </span>

                <input
                  type="search"
                  className="form-control border-start-0"
                  placeholder="Invoice, owner, phone or pet"
                  value={filters.search}
                  onChange={(event) =>
                    setFilters(
                      (previous) => ({
                        ...previous,
                        search:
                          event.target.value,
                      }),
                    )
                  }
                />
              </div>
            </div>

            <div className="col-sm-6 col-lg-2">
              <label className="form-label small fw-semibold">
                Status
              </label>

              <select
                className="form-select"
                value={filters.status}
                onChange={(event) =>
                  setFilters(
                    (previous) => ({
                      ...previous,
                      status:
                        event.target.value,
                    }),
                  )
                }
              >
                <option value="">
                  All statuses
                </option>

                {INVOICE_STATUSES.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {displayStatus(
                        status,
                      )}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="col-sm-6 col-lg-3">
              <label className="form-label small fw-semibold">
                From
              </label>

              <input
                type="date"
                className="form-control"
                value={filters.dateFrom}
                onChange={(event) =>
                  setFilters(
                    (previous) => ({
                      ...previous,
                      dateFrom:
                        event.target.value,
                    }),
                  )
                }
              />
            </div>

            <div className="col-sm-6 col-lg-3">
              <label className="form-label small fw-semibold">
                To
              </label>

              <input
                type="date"
                className="form-control"
                value={filters.dateTo}
                onChange={(event) =>
                  setFilters(
                    (previous) => ({
                      ...previous,
                      dateTo:
                        event.target.value,
                    }),
                  )
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-header bg-white border-0 p-4">
          <h5 className="fw-bold mb-1">
            Invoice records
          </h5>

          <small className="text-secondary">
            {pagination.total} record
            {pagination.total === 1
              ? ""
              : "s"}
          </small>
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="ps-4">
                  Invoice
                </th>
                <th>Owner</th>
                <th>Pet</th>
                <th>Source</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th className="text-end pe-4">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="9"
                    className="text-center py-5"
                  >
                    <div className="spinner-border text-primary" />
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td
                    colSpan="9"
                    className="text-center py-5"
                  >
                    <ReceiptText
                      size={42}
                      className="text-secondary mb-3"
                    />

                    <h6 className="fw-bold">
                      No invoices found
                    </h6>
                  </td>
                </tr>
              ) : (
                invoices.map(
                  (invoice) => (
                    <tr key={invoice.id}>
                      <td className="ps-4">
                        <button
                          type="button"
                          className="btn btn-link p-0 text-decoration-none text-start"
                          onClick={() =>
                            openInvoice(
                              invoice.id,
                            )
                          }
                        >
                          <div className="fw-semibold">
                            {
                              invoice.invoiceNumber
                            }
                          </div>

                          <small className="text-secondary">
                            {dateText(
                              invoice.createdAt,
                            )}
                          </small>
                        </button>
                      </td>

                      <td>
                        <div className="fw-semibold">
                          {ownerName(
                            invoice.owner,
                          )}
                        </div>

                        <small className="text-secondary">
                          {invoice.owner
                            ?.phone ||
                            "No phone"}
                        </small>
                      </td>

                      <td>
                        {getPetNames(
                          invoice,
                        )}
                      </td>

                      <td>
                        {invoice.appointment
                          ?.appointmentNo ||
                          "Retail sale"}
                      </td>

                      <td className="fw-semibold">
                        {money(
                          invoice.totalAmount,
                        )}
                      </td>

                      <td className="text-success">
                        {money(
                          invoice.paidAmount,
                        )}
                      </td>

                      <td className="text-danger">
                        {money(
                          invoice.balanceAmount,
                        )}
                      </td>

                      <td>
                        <span
                          className={`badge ${statusClass(
                            invoice.status,
                          )}`}
                        >
                          {displayStatus(
                            invoice.status,
                          )}
                        </span>
                      </td>

                      <td className="text-end pe-4">
                        <div className="btn-group">
                          <button
                            type="button"
                            className="btn btn-sm btn-light border"
                            onClick={() =>
                              openInvoice(
                                invoice.id,
                              )
                            }
                            title="View"
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm btn-light border"
                            onClick={() =>
                              openPdfPreview(
                                invoice,
                              )
                            }
                            title="PDF preview"
                          >
                            <FileText
                              size={15}
                            />
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm btn-light border"
                            onClick={() =>
                              printInvoice(
                                invoice.id,
                              )
                            }
                            title="Print"
                          >
                            <Printer
                              size={15}
                            />
                          </button>

                          {canManage &&
                            invoice.status ===
                            "DRAFT" && (
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                disabled={saving}
                                onClick={() =>
                                  handleIssue(
                                    invoice,
                                  )
                                }
                                title="Issue"
                              >
                                <FileCheck2
                                  size={15}
                                />
                              </button>
                            )}

                          {canManage &&
                            [
                              "ISSUED",
                              "PARTIALLY_PAID",
                              "OVERDUE",
                            ].includes(
                              invoice.status,
                            ) &&
                            Number(
                              invoice.balanceAmount,
                            ) > 0 && (
                              <button
                                type="button"
                                className="btn btn-sm btn-success"
                                onClick={() =>
                                  openPayment(
                                    invoice,
                                  )
                                }
                                title="Record payment"
                              >
                                <Banknote
                                  size={15}
                                />
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>

        <div className="card-footer bg-white border-0 p-4 d-flex justify-content-between align-items-center">
          <small className="text-secondary">
            Page {pagination.page} of{" "}
            {pagination.totalPages || 1}
          </small>

          <div className="btn-group">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={
                pagination.page <= 1 ||
                loading
              }
              onClick={() =>
                reload(
                  pagination.page - 1,
                )
              }
            >
              Previous
            </button>

            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={
                pagination.page >=
                pagination.totalPages ||
                loading
              }
              onClick={() =>
                reload(
                  pagination.page + 1,
                )
              }
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {showRetailModal && (
        <Modal
          title="New retail inventory invoice"
          size="modal-xl"
          onClose={() =>
            setShowRetailModal(false)
          }
        >
          <form
            onSubmit={
              submitRetailInvoice
            }
          >
            <div className="alert alert-primary border-0">
              <strong>
                Pokhara Pet House
              </strong>{" "}
              will appear as the seller on
              the printed invoice.
            </div>

            <div className="row g-3 mb-4">
              <div className="col-lg-5">
                <label className="form-label fw-semibold">
                  Search owner/customer
                </label>

                <input
                  type="search"
                  className="form-control mb-2"
                  placeholder="Search by name, phone or owner code"
                  value={ownerSearch}
                  onChange={(event) =>
                    setOwnerSearch(
                      event.target.value,
                    )
                  }
                />

                <select
                  className="form-select"
                  value={
                    retailForm.ownerId
                  }
                  onChange={(event) =>
                    setRetailForm(
                      (previous) => ({
                        ...previous,
                        ownerId:
                          event.target.value,
                        items:
                          previous.items.map(
                            (line) => ({
                              ...line,
                              petId: "",
                            }),
                          ),
                      }),
                    )
                  }
                  required
                >
                  <option value="">
                    Select owner/customer
                  </option>

                  {owners.map((owner) => (
                    <option
                      key={owner.id}
                      value={owner.id}
                    >
                      {ownerName(owner)}
                      {owner.phone
                        ? ` — ${owner.phone}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3">
                <label className="form-label fw-semibold">
                  Due date
                </label>

                <input
                  type="date"
                  className="form-control"
                  value={retailForm.dueAt}
                  onChange={(event) =>
                    setRetailForm(
                      (previous) => ({
                        ...previous,
                        dueAt:
                          event.target.value,
                      }),
                    )
                  }
                />
              </div>

              <div className="col-md-4">
                <label className="form-label fw-semibold">
                  Invoice discount
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  value={
                    retailForm.discountAmount
                  }
                  onChange={(event) =>
                    setRetailForm(
                      (previous) => ({
                        ...previous,
                        discountAmount:
                          event.target.value,
                      }),
                    )
                  }
                />
              </div>
            </div>

            <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-3">
              <div>
                <h6 className="fw-bold mb-1">
                  Inventory items
                </h6>

                <small className="text-secondary">
                  Stock is deducted only when
                  the invoice is issued.
                </small>
              </div>

              <div className="d-flex gap-2">
                <input
                  type="search"
                  className="form-control"
                  placeholder="Search inventory"
                  value={inventorySearch}
                  onChange={(event) =>
                    setInventorySearch(
                      event.target.value,
                    )
                  }
                />

                <button
                  type="button"
                  className="btn btn-outline-primary text-nowrap"
                  onClick={addRetailLine}
                >
                  <Plus size={16} />
                  Add row
                </button>
              </div>
            </div>

            <div className="table-responsive border rounded-4 mb-4">
              <table className="table align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">
                      Item
                    </th>
                    <th>Pet</th>
                    <th>Stock</th>
                    <th>Price</th>
                    <th style={{ width: 110 }}>
                      Qty
                    </th>
                    <th style={{ width: 140 }}>
                      Discount
                    </th>
                    <th>Total</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {retailForm.items.map(
                    (line) => {
                      const item =
                        inventoryItems.find(
                          (entry) =>
                            entry.id ===
                            line.inventoryItemId,
                        );

                      const gross =
                        Number(
                          line.quantity || 0,
                        ) *
                        Number(
                          item?.sellingPrice ||
                          0,
                        );

                      return (
                        <tr key={line.key}>
                          <td className="ps-3">
                            <select
                              className="form-select"
                              value={
                                line.inventoryItemId
                              }
                              onChange={(
                                event,
                              ) =>
                                changeRetailLine(
                                  line.key,
                                  "inventoryItemId",
                                  event.target
                                    .value,
                                )
                              }
                              required
                            >
                              <option value="">
                                Select inventory item
                              </option>

                              {inventoryItems.map(
                                (entry) => (
                                  <option
                                    key={entry.id}
                                    value={entry.id}
                                    disabled={
                                      Number(
                                        entry.currentStock,
                                      ) <= 0
                                    }
                                  >
                                    {entry.name} —{" "}
                                    {money(
                                      entry.sellingPrice,
                                    )}{" "}
                                    ({entry.currentStock}{" "}
                                    {entry.unit ||
                                      "units"})
                                  </option>
                                ),
                              )}
                            </select>
                          </td>

                          <td>
                            <select
                              className="form-select"
                              value={
                                line.petId
                              }
                              onChange={(
                                event,
                              ) =>
                                changeRetailLine(
                                  line.key,
                                  "petId",
                                  event.target
                                    .value,
                                )
                              }
                              disabled={
                                !retailForm.ownerId
                              }
                            >
                              <option value="">
                                General / no pet
                              </option>

                              {pets.map((pet) => (
                                <option
                                  key={pet.id}
                                  value={pet.id}
                                >
                                  {pet.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td>
                            {item
                              ? `${item.currentStock} ${item.unit || ""}`
                              : "—"}
                          </td>

                          <td>
                            {item
                              ? money(
                                item.sellingPrice,
                              )
                              : "—"}
                          </td>

                          <td>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              max={
                                item?.currentStock ||
                                undefined
                              }
                              className="form-control"
                              value={
                                line.quantity
                              }
                              onChange={(
                                event,
                              ) =>
                                changeRetailLine(
                                  line.key,
                                  "quantity",
                                  event.target
                                    .value,
                                )
                              }
                              required
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              max={gross}
                              className="form-control"
                              value={
                                line.discountAmount
                              }
                              onChange={(
                                event,
                              ) =>
                                changeRetailLine(
                                  line.key,
                                  "discountAmount",
                                  event.target
                                    .value,
                                )
                              }
                            />
                          </td>

                          <td className="fw-semibold">
                            {money(
                              Math.max(
                                gross -
                                Number(
                                  line.discountAmount ||
                                  0,
                                ),
                                0,
                              ),
                            )}
                          </td>

                          <td>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() =>
                                removeRetailLine(
                                  line.key,
                                )
                              }
                              disabled={
                                retailForm.items
                                  .length === 1
                              }
                            >
                              <Trash2
                                size={15}
                              />
                            </button>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>

            <div className="row g-4">
              <div className="col-lg-7">
                <label className="form-label fw-semibold">
                  Notes
                </label>

                <textarea
                  className="form-control"
                  rows="4"
                  value={retailForm.notes}
                  onChange={(event) =>
                    setRetailForm(
                      (previous) => ({
                        ...previous,
                        notes:
                          event.target.value,
                      }),
                    )
                  }
                  placeholder="Optional invoice note"
                />

                <div className="form-check mt-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="issueImmediately"
                    checked={
                      retailForm.issueImmediately
                    }
                    onChange={(event) =>
                      setRetailForm(
                        (previous) => ({
                          ...previous,
                          issueImmediately:
                            event.target
                              .checked,
                        }),
                      )
                    }
                  />

                  <label
                    className="form-check-label"
                    htmlFor="issueImmediately"
                  >
                    Issue immediately and
                    deduct inventory stock
                  </label>
                </div>
              </div>

              <div className="col-lg-5">
                <div className="border rounded-4 p-4 bg-light">
                  <TotalRow
                    label="Subtotal"
                    value={money(
                      retailSubtotal,
                    )}
                  />

                  <TotalRow
                    label="Estimated tax"
                    value={money(
                      retailTax,
                    )}
                  />

                  <TotalRow
                    label="Invoice discount"
                    value={money(
                      retailForm.discountAmount,
                    )}
                  />

                  <hr />

                  <TotalRow
                    label="Estimated total"
                    value={money(
                      retailTotal,
                    )}
                    bold
                  />
                </div>
              </div>
            </div>

            <ModalActions
              saving={saving}
              submitLabel={
                retailForm.issueImmediately
                  ? "Create and issue invoice"
                  : "Create draft invoice"
              }
              onCancel={() =>
                setShowRetailModal(false)
              }
            />
          </form>
        </Modal>
      )}

      {selectedInvoice && (
        <InvoiceDetailsModal
          invoice={selectedInvoice}
          canManage={canManage}
          canAdmin={canAdmin}
          saving={saving}
          actionLoading={actionLoading}
          onClose={() =>
            setSelectedInvoice(null)
          }
          onPdf={() =>
            openPdfPreview(
              selectedInvoice,
            )
          }
          onPrint={() =>
            printInvoice(
              selectedInvoice.id,
            )
          }
          onIssue={() =>
            handleIssue(
              selectedInvoice,
            )
          }
          onPayment={() =>
            openPayment(
              selectedInvoice,
            )
          }
          onVoid={() =>
            handleVoid(
              selectedInvoice,
            )
          }
          onDelete={() =>
            handleDeleteDraft(
              selectedInvoice,
            )
          }
          showInlineItems={showInlineItems}
          addItemsLines={addItemsLines}
          inventoryItems={inventoryItems}
          inventorySearch={inventorySearch}
          pets={pets}
          onInventorySearch={setInventorySearch}
          onToggleInlineItems={() => {
            if (showInlineItems) {
              setShowInlineItems(false);
              setAddItemsInvoice(null);
            } else {
              openAddInventoryItems(
                selectedInvoice,
              );
            }
          }}
          onAddProduct={
            addInventoryProductToInvoice
          }
          onAddCustomLine={
            addSelectedInvoiceLine
          }
          onChangeLine={
            changeAddItemLine
          }
          onRemoveLine={
            removeSelectedInvoiceLine
          }
          onSubmitItems={
            submitSelectedInvoiceItems
          }
          onRefund={(payment) => {
            setRefundTarget({
              invoiceId:
                selectedInvoice.id,
              payment,
            });
            setRefundReason("");
          }}
        />
      )}

      {pdfPreview && (
        <Modal
          title={`PDF preview — ${pdfPreview.invoice.invoiceNumber}`}
          size="modal-xl"
          onClose={closePdfPreview}
        >
          <div className="d-flex flex-column flex-sm-row justify-content-between gap-2 mb-3">
            <p className="text-secondary mb-0">
              Review the bill before downloading
              or printing it.
            </p>

            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={downloadPdf}
              >
                <Download size={16} />
                Download PDF
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  printInvoice(
                    pdfPreview.invoice.id,
                  )
                }
              >
                <Printer size={16} />
                Print
              </button>
            </div>
          </div>

          <div className="pdf-preview-frame">
            <iframe
              title={`Invoice ${pdfPreview.invoice.invoiceNumber}`}
              src={pdfPreview.url}
            />
          </div>
        </Modal>
      )}

      {paymentInvoice && (
        <Modal
          title=""
          size="modal-lg"
          onClose={() =>
            setPaymentInvoice(null)
          }
        >
          <form
            className="payment-checkout"
            onSubmit={submitPayment}
          >
            {/* Header */}
            <div className="payment-checkout-header">
              <div className="payment-header-icon">
                <CreditCard size={26} />
              </div>

              <div className="flex-grow-1">
                <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                  <h4 className="fw-bold mb-0">
                    Record payment
                  </h4>

                  <span className="badge text-bg-primary">
                    {displayStatus(
                      paymentInvoice.status,
                    )}
                  </span>
                </div>

                <p className="text-secondary mb-0">
                  Invoice{" "}
                  <strong>
                    {paymentInvoice.invoiceNumber}
                  </strong>
                </p>
              </div>
            </div>

            {/* Invoice and customer information */}
            <div className="payment-customer-card">
              <div className="payment-customer-avatar">
                {ownerName(
                  paymentInvoice.owner,
                )
                  ?.charAt(0)
                  ?.toUpperCase() || "C"}
              </div>

              <div className="flex-grow-1">
                <small className="text-secondary">
                  Receiving payment from
                </small>

                <h6 className="fw-bold mb-1">
                  {ownerName(
                    paymentInvoice.owner,
                  )}
                </h6>

                <div className="text-secondary small">
                  {paymentInvoice.owner?.phone ||
                    "No phone number"}
                </div>
              </div>

              <div className="payment-customer-pet">
                <small>Pet</small>

                <strong>
                  {getPetNames(
                    paymentInvoice,
                  )}
                </strong>
              </div>
            </div>

            {/* Totals overview */}
            <div className="payment-amount-overview">
              <div className="payment-overview-item">
                <span>Invoice total</span>

                <strong>
                  {money(
                    paymentInvoice.totalAmount,
                    paymentInvoice.clinic
                      ?.currency || "NPR",
                  )}
                </strong>
              </div>

              <div className="payment-overview-item">
                <span>Already paid</span>

                <strong className="text-success">
                  {money(
                    paymentInvoice.paidAmount,
                    paymentInvoice.clinic
                      ?.currency || "NPR",
                  )}
                </strong>
              </div>

              <div className="payment-overview-item payment-balance-overview">
                <span>Balance due</span>

                <strong>
                  {money(
                    paymentInvoice.balanceAmount,
                    paymentInvoice.clinic
                      ?.currency || "NPR",
                  )}
                </strong>
              </div>
            </div>

            {/* Full or partial payment */}
            <div className="payment-type-section">
              <div className="payment-section-title">
                <div>
                  <h6 className="fw-bold mb-1">
                    Payment amount
                  </h6>

                  <small className="text-secondary">
                    Record the full balance or a
                    partial payment.
                  </small>
                </div>
              </div>

              <div className="payment-quick-options">
                <button
                  type="button"
                  className={
                    Number(paymentForm.amount) ===
                      Number(
                        paymentInvoice.balanceAmount,
                      )
                      ? "payment-option-card active"
                      : "payment-option-card"
                  }
                  onClick={() =>
                    setPaymentForm(
                      (previous) => ({
                        ...previous,
                        amount: Number(
                          paymentInvoice.balanceAmount,
                        ).toFixed(2),
                      }),
                    )
                  }
                >
                  <div className="payment-option-icon">
                    <CheckCircle2 size={19} />
                  </div>

                  <div>
                    <strong>
                      Full payment
                    </strong>

                    <span>
                      {money(
                        paymentInvoice.balanceAmount,
                        paymentInvoice.clinic
                          ?.currency || "NPR",
                      )}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  className={
                    Number(paymentForm.amount) <
                      Number(
                        paymentInvoice.balanceAmount,
                      ) &&
                      Number(paymentForm.amount) > 0
                      ? "payment-option-card active"
                      : "payment-option-card"
                  }
                  onClick={() =>
                    setPaymentForm(
                      (previous) => ({
                        ...previous,
                        amount: "",
                      }),
                    )
                  }
                >
                  <div className="payment-option-icon">
                    <WalletCards size={19} />
                  </div>

                  <div>
                    <strong>
                      Partial payment
                    </strong>

                    <span>
                      Enter a custom amount
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <div className="row g-3">
              {/* Amount */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Amount received
                </label>

                <div className="payment-amount-input">
                  <span>
                    {paymentInvoice.clinic
                      ?.currency || "NPR"}
                  </span>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={
                      paymentInvoice.balanceAmount
                    }
                    value={paymentForm.amount}
                    placeholder="0.00"
                    onChange={(event) =>
                      setPaymentForm(
                        (previous) => ({
                          ...previous,
                          amount:
                            event.target.value,
                        }),
                      )
                    }
                    required
                    autoFocus
                  />
                </div>

                <small className="text-secondary">
                  Maximum{" "}
                  {money(
                    paymentInvoice.balanceAmount,
                    paymentInvoice.clinic
                      ?.currency || "NPR",
                  )}
                </small>
              </div>

              {/* Method */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Payment method
                </label>

                <select
                  className="form-select payment-form-control"
                  value={
                    paymentForm.paymentMethodId
                  }
                  onChange={(event) =>
                    setPaymentForm(
                      (previous) => ({
                        ...previous,
                        paymentMethodId:
                          event.target.value,
                      }),
                    )
                  }
                  required
                >
                  <option value="">
                    Select payment method
                  </option>

                  {paymentMethods.map(
                    (method) => (
                      <option
                        key={method.id}
                        value={method.id}
                      >
                        {method.name}
                      </option>
                    ),
                  )}
                </select>

                {!paymentMethods.length && (
                  <small className="text-danger">
                    No active payment methods
                    found.
                  </small>
                )}
              </div>

              {/* Date */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Payment date and time
                </label>

                <input
                  type="datetime-local"
                  className="form-control payment-form-control"
                  value={paymentForm.paidAt}
                  onChange={(event) =>
                    setPaymentForm(
                      (previous) => ({
                        ...previous,
                        paidAt:
                          event.target.value,
                      }),
                    )
                  }
                  required
                />
              </div>

              {/* Reference */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Transaction reference
                </label>

                <input
                  type="text"
                  className="form-control payment-form-control"
                  placeholder="Receipt, cheque or transaction ID"
                  value={
                    paymentForm.transactionRef
                  }
                  onChange={(event) =>
                    setPaymentForm(
                      (previous) => ({
                        ...previous,
                        transactionRef:
                          event.target.value,
                      }),
                    )
                  }
                />

                <small className="text-secondary">
                  Optional for cash payments
                </small>
              </div>

              {/* Notes */}
              <div className="col-12">
                <label className="form-label fw-semibold">
                  Payment notes
                </label>

                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Add any useful payment details"
                  value={paymentForm.notes}
                  onChange={(event) =>
                    setPaymentForm(
                      (previous) => ({
                        ...previous,
                        notes:
                          event.target.value,
                      }),
                    )
                  }
                />
              </div>
            </div>

            {/* Payment result preview */}
            {Number(paymentForm.amount) > 0 && (
              <div className="payment-result-preview">
                <div>
                  <span>
                    Amount being recorded
                  </span>

                  <strong>
                    {money(
                      paymentForm.amount,
                      paymentInvoice.clinic
                        ?.currency || "NPR",
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Remaining after payment
                  </span>

                  <strong
                    className={
                      Math.max(
                        Number(
                          paymentInvoice.balanceAmount,
                        ) -
                        Number(
                          paymentForm.amount ||
                          0,
                        ),
                        0,
                      ) === 0
                        ? "text-success"
                        : "text-danger"
                    }
                  >
                    {money(
                      Math.max(
                        Number(
                          paymentInvoice.balanceAmount,
                        ) -
                        Number(
                          paymentForm.amount ||
                          0,
                        ),
                        0,
                      ),
                      paymentInvoice.clinic
                        ?.currency || "NPR",
                    )}
                  </strong>
                </div>
              </div>
            )}

            {/* Footer actions */}
            <div className="payment-modal-actions">
              <button
                type="button"
                className="btn btn-light border"
                disabled={saving}
                onClick={() =>
                  setPaymentInvoice(null)
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn btn-success"
                disabled={
                  saving ||
                  !paymentForm.paymentMethodId ||
                  Number(paymentForm.amount) <= 0 ||
                  Number(paymentForm.amount) >
                  Number(
                    paymentInvoice.balanceAmount,
                  )
                }
              >
                {saving ? (
                  <LoaderCircle
                    size={18}
                    className="spin"
                  />
                ) : (
                  <CreditCard size={18} />
                )}

                {saving
                  ? "Recording payment..."
                  : Number(paymentForm.amount) ===
                    Number(
                      paymentInvoice.balanceAmount,
                    )
                    ? "Record full payment"
                    : "Record partial payment"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {refundTarget && (
        <Modal
          title="Refund payment"
          onClose={() =>
            setRefundTarget(null)
          }
        >
          <form onSubmit={submitRefund}>
            <div className="alert alert-warning">
              Refund{" "}
              <strong>
                {money(
                  refundTarget.payment.amount,
                )}
              </strong>
              ?
            </div>

            <label className="form-label">
              Reason
            </label>

            <textarea
              className="form-control"
              rows="3"
              value={refundReason}
              onChange={(event) =>
                setRefundReason(
                  event.target.value,
                )
              }
              required
            />

            <ModalActions
              saving={saving}
              submitLabel="Confirm refund"
              danger
              onCancel={() =>
                setRefundTarget(null)
              }
            />
          </form>
        </Modal>
      )}
    </div>
  );
}

function InvoiceDetailsModal({
  invoice,
  canManage,
  canAdmin,
  saving,
  actionLoading,
  onClose,
  onPdf,
  onPrint,
  onIssue,
  onPayment,
  onVoid,
  onDelete,
  showInlineItems,
  addItemsLines,
  inventoryItems,
  inventorySearch,
  pets,
  onInventorySearch,
  onToggleInlineItems,
  onAddProduct,
  onAddCustomLine,
  onChangeLine,
  onRemoveLine,
  onSubmitItems,
  onRefund,
}) {
  const currency =
    invoice.clinic?.currency || "NPR";

  const invoiceItems =
    invoice.items || [];

  const payments =
    invoice.payments || [];

  const canPay =
    canManage &&
    [
      "ISSUED",
      "PARTIALLY_PAID",
      "OVERDUE",
    ].includes(invoice.status) &&
    Number(invoice.balanceAmount) > 0;

  const isDraft =
    invoice.status === "DRAFT";

  const isPaid =
    invoice.status === "PAID";

  const hasBalance =
    Number(invoice.balanceAmount) > 0;

  return (
    <Modal
      title=""
      size="modal-xl"
      onClose={onClose}
    >
      <div className="advanced-invoice-modal">
        {/* Header */}
        <div className="invoice-modal-header">
          <div className="invoice-modal-header-main">
            <div className="invoice-number-icon">
              <FileText size={24} />
            </div>

            <div>
              <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                <h4 className="fw-bold mb-0">
                  Invoice{" "}
                  {invoice.invoiceNumber}
                </h4>

                <span
                  className={`badge ${statusClass(
                    invoice.status,
                  )}`}
                >
                  {displayStatus(
                    invoice.status,
                  )}
                </span>
              </div>

              <div className="text-secondary small">
                Created{" "}
                {dateTimeText(
                  invoice.createdAt,
                )}
              </div>
            </div>
          </div>

          <div className="invoice-header-actions">
            <button
              type="button"
              className="btn btn-light border"
              disabled={saving}
              onClick={onPdf}
            >
              {actionLoading === "pdf" ? (
                <LoaderCircle
                  className="spin"
                  size={17}
                />
              ) : (
                <FileText size={17} />
              )}

              <span>PDF</span>
            </button>

            <button
              type="button"
              className="btn btn-light border"
              onClick={onPrint}
            >
              <Printer size={17} />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Customer information */}
        <div className="invoice-customer-card">
          <div className="invoice-customer-avatar">
            {ownerName(invoice.owner)
              ?.charAt(0)
              ?.toUpperCase() || "C"}
          </div>

          <div className="flex-grow-1">
            <small className="text-secondary">
              Billed to
            </small>

            <h5 className="fw-bold mb-1">
              {ownerName(invoice.owner)}
            </h5>

            <div className="d-flex flex-wrap gap-3 text-secondary small">
              <span>
                {invoice.owner?.phone ||
                  "No phone number"}
              </span>

              {invoice.owner?.email && (
                <span>
                  {invoice.owner.email}
                </span>
              )}
            </div>
          </div>

          <div className="invoice-customer-meta">
            <div>
              <small>Pet</small>
              <strong>
                {getPetNames(invoice)}
              </strong>
            </div>

            <div>
              <small>Source</small>
              <strong>
                {invoice.appointment
                  ?.appointmentNo ||
                  "Retail sale"}
              </strong>
            </div>

            <div>
              <small>Due date</small>
              <strong>
                {dateText(invoice.dueAt)}
              </strong>
            </div>
          </div>
        </div>

        {invoice.appointment &&
          isDraft && (
            <div className="appointment-invoice-hint mb-3">
              <CheckCircle2 size={18} />

              <div>
                <strong>
                  Appointment service included
                </strong>

                <div className="small">
                  Add medicines or products
                  purchased by the customer
                  before issuing the invoice.
                </div>
              </div>
            </div>
          )}

        <div className="row g-4">
          {/* Left section */}
          <div className="col-xl-8">
            <section className="invoice-content-card">
              <div className="invoice-section-header">
                <div>
                  <h5 className="fw-bold mb-1">
                    Invoice items
                  </h5>

                  <small className="text-secondary">
                    {invoiceItems.length}{" "}
                    {invoiceItems.length === 1
                      ? "item"
                      : "items"}{" "}
                    currently on this invoice
                  </small>
                </div>

                {canManage && isDraft && (
                  <button
                    type="button"
                    className={
                      showInlineItems
                        ? "btn btn-outline-secondary"
                        : "btn btn-primary"
                    }
                    disabled={saving}
                    onClick={
                      onToggleInlineItems
                    }
                  >
                    <ShoppingCart
                      size={17}
                    />

                    {showInlineItems
                      ? "Close product selector"
                      : "Add products"}
                  </button>
                )}
              </div>

              {invoiceItems.length ? (
                <div className="invoice-items-list">
                  {invoiceItems.map(
                    (item, index) => {
                      const itemType =
                        item.inventoryItem
                          ? "Inventory"
                          : item.service
                            ? "Service"
                            : "Custom";

                      return (
                        <div
                          className="invoice-item-row"
                          key={item.id}
                        >
                          <div className="invoice-item-index">
                            {index + 1}
                          </div>

                          <div className="invoice-item-main">
                            <div className="d-flex justify-content-between gap-3">
                              <div>
                                <h6 className="fw-bold mb-1">
                                  {
                                    item.description
                                  }
                                </h6>

                                <div className="d-flex flex-wrap gap-2">
                                  <span className="invoice-item-type">
                                    {itemType}
                                  </span>

                                  {item.pet
                                    ?.name && (
                                      <span className="invoice-item-pet">
                                        Pet:{" "}
                                        {
                                          item.pet
                                            .name
                                        }
                                      </span>
                                    )}
                                </div>
                              </div>

                              <strong className="invoice-item-total">
                                {money(
                                  item.lineTotal,
                                  currency,
                                )}
                              </strong>
                            </div>

                            <div className="invoice-item-breakdown">
                              <span>
                                Qty:{" "}
                                <strong>
                                  {Number(
                                    item.quantity,
                                  )}
                                </strong>
                              </span>

                              <span>
                                Price:{" "}
                                <strong>
                                  {money(
                                    item.unitPrice,
                                    currency,
                                  )}
                                </strong>
                              </span>

                              {Number(
                                item.discountAmount,
                              ) > 0 && (
                                  <span>
                                    Discount:{" "}
                                    <strong>
                                      {money(
                                        item.discountAmount,
                                        currency,
                                      )}
                                    </strong>
                                  </span>
                                )}

                              {Number(
                                item.taxAmount,
                              ) > 0 && (
                                  <span>
                                    Tax:{" "}
                                    <strong>
                                      {money(
                                        item.taxAmount,
                                        currency,
                                      )}
                                    </strong>
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              ) : (
                <div className="invoice-empty-items">
                  <ShoppingCart
                    size={42}
                  />

                  <h6 className="fw-bold mt-3 mb-1">
                    No items added
                  </h6>

                  <p className="text-secondary mb-3">
                    Add a service, medicine,
                    food or another inventory
                    product.
                  </p>

                  {canManage && isDraft && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={
                        onToggleInlineItems
                      }
                    >
                      <ShoppingCart
                        size={17}
                      />
                      Add first product
                    </button>
                  )}
                </div>
              )}

              {/* Product selector appears directly here */}
              {showInlineItems &&
                isDraft && (
                  <div className="invoice-product-selector">
                    <InlineInvoiceItems
                      invoice={invoice}
                      lines={addItemsLines}
                      inventoryItems={
                        inventoryItems
                      }
                      inventorySearch={
                        inventorySearch
                      }
                      pets={pets}
                      saving={saving}
                      actionLoading={
                        actionLoading
                      }
                      onSearch={
                        onInventorySearch
                      }
                      onAddProduct={
                        onAddProduct
                      }
                      onAddCustomLine={
                        onAddCustomLine
                      }
                      onChangeLine={
                        onChangeLine
                      }
                      onRemoveLine={
                        onRemoveLine
                      }
                      onSubmit={
                        onSubmitItems
                      }
                      onCancel={
                        onToggleInlineItems
                      }
                    />
                  </div>
                )}
            </section>

            {/* Payments */}
            <section className="invoice-content-card mt-4">
              <div className="invoice-section-header">
                <div>
                  <h5 className="fw-bold mb-1">
                    Payment history
                  </h5>

                  <small className="text-secondary">
                    All payments recorded
                    against this invoice
                  </small>
                </div>

                {payments.length > 0 && (
                  <span className="badge text-bg-light border">
                    {payments.length}
                  </span>
                )}
              </div>

              {payments.length ? (
                <div className="payment-history-list">
                  {payments.map(
                    (payment) => (
                      <div
                        key={payment.id}
                        className="payment-history-item"
                      >
                        <div className="payment-method-icon">
                          <CreditCard
                            size={18}
                          />
                        </div>

                        <div className="flex-grow-1">
                          <div className="d-flex flex-wrap justify-content-between gap-2">
                            <div>
                              <h6 className="fw-bold mb-1">
                                {payment
                                  .paymentMethod
                                  ?.name ||
                                  "Payment"}
                              </h6>

                              <div className="text-secondary small">
                                {
                                  payment.paymentNumber
                                }{" "}
                                •{" "}
                                {dateTimeText(
                                  payment.paidAt,
                                )}
                              </div>
                            </div>

                            <div className="text-end">
                              <strong className="d-block">
                                {money(
                                  payment.amount,
                                  currency,
                                )}
                              </strong>

                              <small
                                className={
                                  payment.status ===
                                    "COMPLETED"
                                    ? "text-success"
                                    : "text-secondary"
                                }
                              >
                                {displayStatus(
                                  payment.status,
                                )}
                              </small>
                            </div>
                          </div>
                        </div>

                        {canAdmin &&
                          payment.status ===
                          "COMPLETED" && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() =>
                                onRefund(
                                  payment,
                                )
                              }
                            >
                              <Undo2
                                size={14}
                              />
                              Refund
                            </button>
                          )}
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div className="invoice-empty-payment">
                  <CreditCard size={32} />

                  <div>
                    <strong>
                      No payment recorded
                    </strong>

                    <p className="text-secondary small mb-0">
                      Payment information
                      will appear here.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Right sticky summary */}
          <div className="col-xl-4">
            <div className="invoice-summary-sticky">
              <section className="invoice-summary-card">
                <div className="invoice-summary-heading">
                  <div>
                    <small>
                      Invoice total
                    </small>

                    <h3 className="fw-bold mb-0">
                      {money(
                        invoice.totalAmount,
                        currency,
                      )}
                    </h3>
                  </div>

                  {isPaid && (
                    <CheckCircle2
                      size={26}
                      className="text-success"
                    />
                  )}
                </div>

                <div className="invoice-summary-rows">
                  <TotalRow
                    label="Subtotal"
                    value={money(
                      invoice.subtotal,
                      currency,
                    )}
                  />

                  <TotalRow
                    label="Discount"
                    value={money(
                      invoice.discountAmount,
                      currency,
                    )}
                  />

                  <TotalRow
                    label="Tax"
                    value={money(
                      invoice.taxAmount,
                      currency,
                    )}
                  />

                  <div className="invoice-summary-divider" />

                  <TotalRow
                    label="Paid"
                    value={money(
                      invoice.paidAmount,
                      currency,
                    )}
                  />

                  <TotalRow
                    label="Balance due"
                    value={money(
                      invoice.balanceAmount,
                      currency,
                    )}
                    bold
                  />
                </div>

                {hasBalance &&
                  !isDraft && (
                    <div className="balance-due-message">
                      <span>
                        Remaining balance
                      </span>

                      <strong>
                        {money(
                          invoice.balanceAmount,
                          currency,
                        )}
                      </strong>
                    </div>
                  )}
              </section>

              <section className="invoice-action-card">
                <h6 className="fw-bold mb-3">
                  Invoice actions
                </h6>

                {canManage &&
                  isDraft && (
                    <>
                      <button
                        type="button"
                        className="btn btn-outline-primary w-100"
                        disabled={saving}
                        onClick={
                          onToggleInlineItems
                        }
                      >
                        <ShoppingCart
                          size={17}
                        />

                        {showInlineItems
                          ? "Finish adding products"
                          : "Add products"}
                      </button>

                      <button
                        type="button"
                        className="btn btn-primary w-100"
                        disabled={saving}
                        onClick={onIssue}
                      >
                        {actionLoading ===
                          "issue" ? (
                          <LoaderCircle
                            className="spin"
                            size={17}
                          />
                        ) : (
                          <FileCheck2
                            size={17}
                          />
                        )}

                        Issue invoice
                      </button>

                      <small className="text-secondary text-center">
                        Confirm all products
                        before issuing.
                      </small>
                    </>
                  )}

                {canPay && (
                  <button
                    type="button"
                    className="btn btn-success w-100"
                    disabled={saving}
                    onClick={onPayment}
                  >
                    <CreditCard
                      size={17}
                    />
                    Record payment
                  </button>
                )}

                {isPaid && (
                  <div className="invoice-paid-message">
                    <CheckCircle2
                      size={19}
                    />

                    <div>
                      <strong>
                        Payment complete
                      </strong>

                      <small>
                        This invoice has
                        been fully paid.
                      </small>
                    </div>
                  </div>
                )}

                {!isDraft && (
                  <>
                    <button
                      type="button"
                      className="btn btn-light border w-100"
                      onClick={onPrint}
                    >
                      <Printer size={17} />
                      Print invoice
                    </button>

                    <button
                      type="button"
                      className="btn btn-light border w-100"
                      onClick={onPdf}
                    >
                      <FileText
                        size={17}
                      />
                      Download PDF
                    </button>
                  </>
                )}

                {canAdmin &&
                  ![
                    "DRAFT",
                    "VOID",
                  ].includes(
                    invoice.status,
                  ) && (
                    <button
                      type="button"
                      className="btn btn-outline-danger w-100"
                      disabled={saving}
                      onClick={onVoid}
                    >
                      Void invoice
                    </button>
                  )}

                {canManage &&
                  isDraft && (
                    <button
                      type="button"
                      className="btn btn-link text-danger text-decoration-none w-100"
                      disabled={saving}
                      onClick={onDelete}
                    >
                      <Trash2
                        size={16}
                      />
                      Delete draft
                    </button>
                  )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function InlineInvoiceItems({
  invoice,
  lines,
  inventoryItems,
  inventorySearch,
  pets,
  saving,
  actionLoading,
  onSearch,
  onAddProduct,
  onAddCustomLine,
  onChangeLine,
  onRemoveLine,
  onSubmit,
  onCancel,
}) {
  const selectedCount =
    lines.filter(
      (line) =>
        line.inventoryItemId,
    ).length;

  return (
    <section className="inline-invoice-items mt-4">
      <div className="inline-invoice-items-header">
        <div>
          <span className="inline-items-kicker">
            Add to this bill
          </span>

          <h5 className="fw-bold mb-1">
            Inventory products
          </h5>

          <p className="text-secondary mb-0">
            The appointment service remains
            on the bill. Add only the extra
            products purchased by the customer.
          </p>
        </div>

        <div className="inline-items-current-total">
          <span>Current bill</span>

          <strong>
            {money(
              invoice.totalAmount,
            )}
          </strong>
        </div>
      </div>

      <form onSubmit={onSubmit}>
        <div className="row g-4 mt-1">
          <div className="col-xl-7">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
              <div>
                <h6 className="fw-bold mb-1">
                  Available products
                </h6>

                <small className="text-secondary">
                  Click a product to add it
                  to this bill.
                </small>
              </div>

              <div className="inventory-search-box">
                <Search
                  size={17}
                  className="text-secondary"
                />

                <input
                  type="search"
                  value={inventorySearch}
                  onChange={(event) =>
                    onSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Search products..."
                />
              </div>
            </div>

            <div className="inventory-catalogue inline-catalogue">
              {inventoryItems.length ? (
                inventoryItems.map(
                  (item) => {
                    const outOfStock =
                      Number(
                        item.currentStock,
                      ) <= 0;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className="inventory-product-card"
                        disabled={
                          outOfStock
                        }
                        onClick={() =>
                          onAddProduct(
                            item,
                          )
                        }
                      >
                        <div className="inventory-product-icon">
                          <Package
                            size={21}
                          />
                        </div>

                        <div className="inventory-product-content">
                          <div className="d-flex justify-content-between gap-2">
                            <strong>
                              {item.name}
                            </strong>

                            <span className="fw-bold text-primary">
                              {money(
                                item.sellingPrice,
                              )}
                            </span>
                          </div>

                          <div className="d-flex flex-wrap gap-2 mt-2">
                            {item.sku && (
                              <span className="inventory-meta">
                                SKU {item.sku}
                              </span>
                            )}

                            <span
                              className={`inventory-meta ${outOfStock
                                ? "inventory-meta-danger"
                                : ""
                                }`}
                            >
                              {outOfStock
                                ? "Out of stock"
                                : `${item.currentStock} ${item.unit || "units"} available`}
                            </span>
                          </div>
                        </div>

                        <span className="inventory-add-icon">
                          <Plus
                            size={18}
                          />
                        </span>
                      </button>
                    );
                  },
                )
              ) : (
                <div className="empty-catalogue">
                  <Package
                    size={38}
                    className="text-secondary mb-2"
                  />

                  <strong>
                    No products found
                  </strong>

                  <span className="text-secondary">
                    Try another search.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="col-xl-5">
            <div className="invoice-cart-panel inline-cart-panel">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h6 className="fw-bold mb-1">
                    Items to add
                  </h6>

                  <small className="text-secondary">
                    {selectedCount} selected
                  </small>
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={
                    onAddCustomLine
                  }
                >
                  <Plus size={15} />
                  Add row
                </button>
              </div>

              <div className="invoice-cart-lines">
                {lines.map(
                  (line, index) => {
                    const item =
                      inventoryItems.find(
                        (entry) =>
                          entry.id ===
                          line.inventoryItemId,
                      );

                    const lineGross =
                      Number(
                        item?.sellingPrice ||
                        0,
                      ) *
                      Number(
                        line.quantity || 0,
                      );

                    const lineTotal =
                      Math.max(
                        lineGross -
                        Number(
                          line.discountAmount ||
                          0,
                        ),
                        0,
                      );

                    return (
                      <div
                        key={line.key}
                        className="invoice-cart-line"
                      >
                        <div className="d-flex justify-content-between gap-2 mb-3">
                          <div className="flex-grow-1">
                            <label className="form-label small fw-semibold d-flex align-items-center gap-1">
                              Product
                              <span className="text-danger">
                                *
                              </span>
                            </label>

                            <InventorySelect
                              value={
                                line.inventoryItemId
                              }
                              items={
                                inventoryItems
                              }
                              onChange={(value) =>
                                onChangeLine(
                                  line.key,
                                  "inventoryItemId",
                                  value,
                                )
                              }
                            />
                          </div>

                          <button
                            type="button"
                            className="btn btn-sm btn-light border align-self-end invoice-remove-line"
                            disabled={
                              lines.length ===
                              1
                            }
                            onClick={() =>
                              onRemoveLine(
                                line.key,
                              )
                            }
                            aria-label={`Remove product ${index + 1}`}
                          >
                            <Trash2
                              size={16}
                            />
                          </button>
                        </div>

                        <div className="row g-2">
                          <div className="col-12">
                            <label className="form-label small fw-semibold">
                              Pet
                            </label>

                            <PetSelect
                              value={
                                line.petId
                              }
                              pets={pets}
                              onChange={(value) =>
                                onChangeLine(
                                  line.key,
                                  "petId",
                                  value,
                                )
                              }
                            />
                          </div>

                          <div className="col-6">
                            <label className="form-label small fw-semibold d-flex align-items-center gap-1">
                              Quantity
                              <span className="text-danger">
                                *
                              </span>
                            </label>

                            <input
                              type="number"
                              className="form-control"
                              min="1"
                              max={
                                item?.currentStock ||
                                undefined
                              }
                              value={
                                line.quantity
                              }
                              onChange={(event) =>
                                onChangeLine(
                                  line.key,
                                  "quantity",
                                  event.target.value,
                                )
                              }
                              required
                            />
                          </div>

                          <div className="col-6">
                            <label className="form-label small fw-semibold">
                              Discount
                            </label>

                            <input
                              type="number"
                              className="form-control"
                              min="0"
                              step="0.01"
                              max={lineGross}
                              value={
                                line.discountAmount
                              }
                              onChange={(event) =>
                                onChangeLine(
                                  line.key,
                                  "discountAmount",
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                        </div>

                        <div className="invoice-cart-line-footer">
                          <span>
                            {item
                              ? `${item.currentStock} ${item.unit || "units"} in stock`
                              : "Choose a product"}
                          </span>

                          <strong>
                            {money(
                              lineTotal,
                            )}
                          </strong>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>

              <div className="invoice-cart-note">
                <AlertTriangle
                  size={17}
                />

                <span>
                  Stock is deducted only when
                  this invoice is issued.
                </span>
              </div>

              <div className="d-grid gap-2 mt-3">
                <button
                  type="submit"
                  className="btn btn-primary d-flex align-items-center justify-content-center gap-2"
                  disabled={saving}
                >
                  {actionLoading ===
                    "add-items" ? (
                    <LoaderCircle
                      className="spin"
                      size={18}
                    />
                  ) : (
                    <ShoppingCart
                      size={18}
                    />
                  )}

                  Add selected items
                </button>

                <button
                  type="button"
                  className="btn btn-light border"
                  disabled={saving}
                  onClick={onCancel}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}

function InventorySelect({
  value,
  items,
  onChange,
}) {
  return (
    <select
      className="form-select"
      value={value}
      onChange={(event) =>
        onChange(event.target.value)
      }
      required
    >
      <option value="">
        Select inventory item
      </option>

      {items.map((item) => (
        <option
          key={item.id}
          value={item.id}
          disabled={
            Number(item.currentStock) <=
            0
          }
        >
          {item.name} —{" "}
          {money(item.sellingPrice)} (
          {item.currentStock}{" "}
          {item.unit || "units"})
        </option>
      ))}
    </select>
  );
}

function PetSelect({
  value,
  pets,
  onChange,
}) {
  return (
    <select
      className="form-select"
      value={value}
      onChange={(event) =>
        onChange(event.target.value)
      }
    >
      <option value="">
        General / no pet
      </option>

      {(pets || []).map((pet) => (
        <option
          key={pet.id}
          value={pet.id}
        >
          {pet.name}
        </option>
      ))}
    </select>
  );
}

function LoadingOverlay({
  label = "Loading...",
}) {
  return (
    <div
      className="sales-loading-overlay"
      role="status"
      aria-live="polite"
    >
      <div className="sales-loading-card">
        <LoaderCircle
          className="spin text-primary"
          size={34}
        />

        <div className="fw-semibold">
          {label}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}) {
  return (
    <div className="col-sm-6 col-xl-3">
      <div className="card border-0 shadow-sm rounded-4 h-100">
        <div className="card-body p-4 d-flex justify-content-between gap-3">
          <div>
            <small className="text-secondary">
              {label}
            </small>

            <h5 className="fw-bold mt-2 mb-0">
              {value}
            </h5>
          </div>

          <div
            className="d-flex align-items-center justify-content-center rounded-3 bg-primary-subtle text-primary"
            style={{
              width: 44,
              height: 44,
              minWidth: 44,
            }}
          >
            <Icon size={21} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailCard({
  label,
  value,
}) {
  return (
    <div className="col-sm-6 col-xl-3">
      <div className="border rounded-4 p-3 h-100">
        <small className="text-secondary">
          {label}
        </small>

        <div className="fw-semibold mt-1">
          {value}
        </div>
      </div>
    </div>
  );
}

function TotalRow({
  label,
  value,
  bold = false,
}) {
  return (
    <div className="d-flex justify-content-between py-1 gap-3">
      <span
        className={
          bold ? "fw-bold" : ""
        }
      >
        {label}
      </span>

      <span
        className={
          bold ? "fw-bold" : ""
        }
      >
        {value}
      </span>
    </div>
  );
}

function AlertMessage({
  type,
  message,
  onClose,
}) {
  return (
    <div
      className={`alert alert-${type} border-0 shadow-sm d-flex justify-content-between align-items-center`}
    >
      <span>{message}</span>

      <button
        type="button"
        className="btn-close"
        onClick={onClose}
      />
    </div>
  );
}

function ModalActions({
  saving,
  submitLabel,
  onCancel,
  danger = false,
}) {
  return (
    <div className="d-flex justify-content-end gap-2 mt-4">
      <button
        type="button"
        className="btn btn-light border"
        onClick={onCancel}
      >
        Cancel
      </button>

      <button
        type="submit"
        className={
          danger
            ? "btn btn-danger"
            : "btn btn-primary"
        }
        disabled={saving}
      >
        {saving
          ? "Saving..."
          : submitLabel}
      </button>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
  size = "modal-lg",
}) {
  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex="-1"
      >
        <div
          className={`modal-dialog ${size} modal-dialog-centered modal-dialog-scrollable sales-modal-dialog`}
        >
          <div className="modal-content border-0 shadow">
            <div className="modal-header sales-modal-header">
              <h5 className="modal-title fw-bold mb-0">
                {title}
              </h5>

              <button
                type="button"
                className="btn-close sales-modal-close"
                aria-label="Close"
                onClick={onClose}
              />
            </div>

            <div className="modal-body p-4">
              {children}
            </div>
          </div>
        </div>
      </div>

      <div className="modal-backdrop fade show" />
    </>
  );
}

function buildPrintHtml(
  invoice,
  currency,
) {
  const clinicName =
    invoice.clinic?.name ||
    "Pokhara Pet House";

  const rows = (invoice.items || [])
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(
        item.description,
      )}</td>
          <td>${escapeHtml(
        item.pet?.name || "—",
      )}</td>
          <td class="right">${Number(
        item.quantity,
      )}</td>
          <td class="right">${escapeHtml(
        money(
          item.unitPrice,
          currency,
        ),
      )}</td>
          <td class="right">${escapeHtml(
        money(
          item.lineTotal,
          currency,
        ),
      )}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(
    invoice.invoiceNumber,
  )}</title>

        <style>
          body {
            font-family: Arial, sans-serif;
            color: #1f2937;
            margin: 40px;
          }

          .brand {
            font-size: 30px;
            font-weight: 800;
            margin: 0 0 6px;
          }

          .header {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            border-bottom: 2px solid #111827;
            padding-bottom: 20px;
            margin-bottom: 24px;
          }

          .right {
            text-align: right;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 24px;
          }

          th, td {
            border-bottom: 1px solid #e5e7eb;
            padding: 10px;
            text-align: left;
          }

          .totals {
            width: 360px;
            margin-left: auto;
            margin-top: 24px;
          }

          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
          }

          .grand-total {
            border-top: 2px solid #111827;
            margin-top: 8px;
            padding-top: 10px;
            font-weight: bold;
          }

          .muted {
            color: #6b7280;
          }
        </style>
      </head>

      <body>
        <div class="header">
          <div>
            <div class="brand">
              ${escapeHtml(
    clinicName,
  )}
            </div>

            <div>
              Veterinary Clinic &amp;
              Pet Supplies
            </div>

            <div class="muted">
              ${escapeHtml(
    invoice.clinic?.address ||
    "",
  )}
            </div>

            <div class="muted">
              ${escapeHtml(
    invoice.clinic?.phone ||
    "",
  )}
            </div>
          </div>

          <div class="right">
            <h2>Invoice</h2>

            <strong>
              ${escapeHtml(
    invoice.invoiceNumber,
  )}
            </strong>

            <div>
              ${escapeHtml(
    dateText(
      invoice.createdAt,
    ),
  )}
            </div>

            <div>
              Status:
              ${escapeHtml(
    displayStatus(
      invoice.status,
    ),
  )}
            </div>
          </div>
        </div>

        <div>
          <strong>Bill to:</strong>

          <div>
            ${escapeHtml(
    ownerName(
      invoice.owner,
    ),
  )}
          </div>

          <div class="muted">
            ${escapeHtml(
    invoice.owner?.phone ||
    "",
  )}
          </div>

          <div class="muted">
            ${escapeHtml(
    invoice.owner?.address ||
    "",
  )}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Pet</th>
              <th class="right">Qty</th>
              <th class="right">
                Unit price
              </th>
              <th class="right">
                Total
              </th>
            </tr>
          </thead>

          <tbody>${rows}</tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal</span>
            <span>${escapeHtml(
    money(
      invoice.subtotal,
      currency,
    ),
  )}</span>
          </div>

          <div class="total-row">
            <span>Discount</span>
            <span>${escapeHtml(
    money(
      invoice.discountAmount,
      currency,
    ),
  )}</span>
          </div>

          <div class="total-row">
            <span>Tax</span>
            <span>${escapeHtml(
    money(
      invoice.taxAmount,
      currency,
    ),
  )}</span>
          </div>

          <div class="total-row grand-total">
            <span>Total</span>
            <span>${escapeHtml(
    money(
      invoice.totalAmount,
      currency,
    ),
  )}</span>
          </div>

          <div class="total-row">
            <span>Paid</span>
            <span>${escapeHtml(
    money(
      invoice.paidAmount,
      currency,
    ),
  )}</span>
          </div>

          <div class="total-row">
            <span>Balance</span>
            <span>${escapeHtml(
    money(
      invoice.balanceAmount,
      currency,
    ),
  )}</span>
          </div>
        </div>
      </body>
    </html>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default Sales;
