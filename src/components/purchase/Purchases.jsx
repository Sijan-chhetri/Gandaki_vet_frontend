import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  CalendarDays,
  Mail,
  MapPin,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  FileText,
  PackagePlus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
  WalletCards,
  X,
  Phone,
} from "lucide-react";

const initialPurchases = [
  {
    id: 1,
    purchaseNumber: "PUR-0001",
    invoiceNumber: "INV-SUP-101",
    supplierName: "Himalayan Veterinary Suppliers",
    supplierPhone: "9801002003",
    purchaseDate: "2026-07-10",
    expectedDate: "2026-07-12",
    paymentMethod: "Bank Transfer",
    paymentStatus: "Paid",
    purchaseStatus: "Received",
    discount: 500,
    taxPercent: 13,
    paidAmount: 20880,
    notes: "Monthly medicine and consumable purchase.",
    items: [
      {
        id: 101,
        itemName: "Rabies Vaccine",
        category: "Vaccines",
        quantity: 20,
        unit: "Dose",
        unitPrice: 650,
      },
      {
        id: 102,
        itemName: "Disposable Syringe 5ml",
        category: "Consumables",
        quantity: 100,
        unit: "Piece",
        unitPrice: 35,
      },
      {
        id: 103,
        itemName: "Amoxicillin Injection",
        category: "Medicines",
        quantity: 15,
        unit: "Vial",
        unitPrice: 180,
      },
    ],
  },
  {
    id: 2,
    purchaseNumber: "PUR-0002",
    invoiceNumber: "INV-PET-214",
    supplierName: "Pokhara Pet Care Distributors",
    supplierPhone: "9812349876",
    purchaseDate: "2026-07-14",
    expectedDate: "2026-07-16",
    paymentMethod: "Cash",
    paymentStatus: "Partial",
    purchaseStatus: "Received",
    discount: 200,
    taxPercent: 13,
    paidAmount: 7000,
    notes: "Pet food and grooming products.",
    items: [
      {
        id: 201,
        itemName: "Premium Dog Food 10kg",
        category: "Pet Food",
        quantity: 8,
        unit: "Bag",
        unitPrice: 2200,
      },
      {
        id: 202,
        itemName: "Pet Shampoo",
        category: "Grooming",
        quantity: 12,
        unit: "Bottle",
        unitPrice: 350,
      },
    ],
  },
  {
    id: 3,
    purchaseNumber: "PUR-0003",
    invoiceNumber: "INV-LAB-303",
    supplierName: "Nepal Veterinary Lab Solutions",
    supplierPhone: "9845001122",
    purchaseDate: "2026-07-18",
    expectedDate: "2026-07-22",
    paymentMethod: "Credit",
    paymentStatus: "Unpaid",
    purchaseStatus: "Pending",
    discount: 0,
    taxPercent: 13,
    paidAmount: 0,
    notes: "Laboratory reagents awaiting delivery.",
    items: [
      {
        id: 301,
        itemName: "CBC Reagent Pack",
        category: "Laboratory",
        quantity: 3,
        unit: "Pack",
        unitPrice: 8500,
      },
      {
        id: 302,
        itemName: "EDTA Tube",
        category: "Laboratory",
        quantity: 200,
        unit: "Piece",
        unitPrice: 18,
      },
    ],
  },
];

const initialSuppliers = [
  {
    id: 1,
    name: "Himalayan Veterinary Suppliers",
    contactPerson: "Rajesh Sharma",
    phone: "9801002003",
    email: "sales@himalayanvet.com",
    address: "New Road, Pokhara",
    status: "Active",
    notes: "Primary supplier for vaccines and medicines.",
  },
  {
    id: 2,
    name: "Pokhara Pet Care Distributors",
    contactPerson: "Mina Gurung",
    phone: "9812349876",
    email: "orders@pokharapetcare.com",
    address: "Bagar, Pokhara",
    status: "Active",
    notes: "Pet food, grooming products and accessories.",
  },
  {
    id: 3,
    name: "Nepal Veterinary Lab Solutions",
    contactPerson: "Suresh Adhikari",
    phone: "9845001122",
    email: "info@vetlabsolutions.com",
    address: "Kathmandu, Nepal",
    status: "Active",
    notes: "Laboratory reagents and diagnostic supplies.",
  },
  {
    id: 4,
    name: "Gandaki Animal Health Traders",
    contactPerson: "Bikash Thapa",
    phone: "9867008899",
    email: "gandakihealth@gmail.com",
    address: "Mahendrapul, Pokhara",
    status: "Inactive",
    notes: "General veterinary products.",
  },
];

const createEmptySupplierForm = () => ({
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  status: "Active",
  notes: "",
});

const categoryOptions = [
  "Medicines",
  "Vaccines",
  "Consumables",
  "Laboratory",
  "Pet Food",
  "Grooming",
  "Accessories",
  "Other",
];

const unitOptions = [
  "Piece",
  "Box",
  "Pack",
  "Bottle",
  "Vial",
  "Dose",
  "Bag",
  "Strip",
  "Kg",
  "Litre",
];

const emptyItem = {
  itemName: "",
  category: "Medicines",
  quantity: 1,
  unit: "Piece",
  unitPrice: "",
};

const createEmptyForm = () => ({
  invoiceNumber: "",
  supplierName: "",
  supplierPhone: "",
  purchaseDate: new Date().toISOString().split("T")[0],
  expectedDate: "",
  paymentMethod: "Cash",
  paymentStatus: "Unpaid",
  purchaseStatus: "Pending",
  discount: "",
  taxPercent: 13,
  paidAmount: "",
  notes: "",
  items: [{ id: Date.now(), ...emptyItem }],
});

function Purchases() {
  const [purchases, setPurchases] = useState(() => {
    const saved = localStorage.getItem("clinicPurchases");
    return saved ? JSON.parse(saved) : initialPurchases;
  });

  const [suppliers, setSuppliers] = useState(() => {
    const saved = localStorage.getItem("clinicSuppliers");
    return saved ? JSON.parse(saved) : initialSuppliers;
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");

  const [showForm, setShowForm] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [editingPurchaseId, setEditingPurchaseId] = useState(null);
  const [formData, setFormData] = useState(createEmptyForm);
  const [formError, setFormError] = useState("");

  const location = useLocation();
  const navigate = useNavigate();

  const [showSupplierForm, setShowSupplierForm] =
    useState(false);
  const [editingSupplierId, setEditingSupplierId] =
    useState(null);
  const [supplierFormData, setSupplierFormData] =
    useState(createEmptySupplierForm);
  const [supplierFormError, setSupplierFormError] =
    useState("");

  useEffect(() => {
    localStorage.setItem(
      "clinicPurchases",
      JSON.stringify(purchases)
    );
  }, [purchases]);

  useEffect(() => {
    localStorage.setItem(
      "clinicSuppliers",
      JSON.stringify(suppliers)
    );
  }, [suppliers]);

  useEffect(() => {
    if (location.state?.action === "add") {
      openAddForm();

      navigate(location.pathname, {
        replace: true,
        state: null,
      });
    }
  }, [location.state]);

  const filteredPurchases = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return purchases.filter((purchase) => {
      const matchesSearch =
        purchase.purchaseNumber.toLowerCase().includes(search) ||
        purchase.invoiceNumber.toLowerCase().includes(search) ||
        purchase.supplierName.toLowerCase().includes(search) ||
        purchase.supplierPhone.includes(search);

      const matchesSupplier =
        supplierFilter === "All" ||
        purchase.supplierName === supplierFilter;

      const matchesStatus =
        statusFilter === "All" ||
        purchase.purchaseStatus === statusFilter;

      const matchesPayment =
        paymentFilter === "All" ||
        purchase.paymentStatus === paymentFilter;

      return (
        matchesSearch &&
        matchesSupplier &&
        matchesStatus &&
        matchesPayment
      );
    });
  }, [
    purchases,
    searchTerm,
    supplierFilter,
    statusFilter,
    paymentFilter,
  ]);

  const totals = useMemo(() => {
    return purchases.reduce(
      (result, purchase) => {
        const calculated = calculatePurchaseTotals(purchase);

        result.totalAmount += calculated.grandTotal;
        result.totalPaid += Number(purchase.paidAmount) || 0;
        result.totalDue += calculated.dueAmount;

        if (purchase.purchaseStatus === "Pending") {
          result.pending += 1;
        }

        return result;
      },
      {
        totalAmount: 0,
        totalPaid: 0,
        totalDue: 0,
        pending: 0,
      }
    );
  }, [purchases]);

  function handleSupplierFormChange(event) {
    const { name, value } = event.target;

    setSupplierFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setSupplierFormError("");
  }

  function openAddSupplierForm() {
    setEditingSupplierId(null);
    setSupplierFormData(createEmptySupplierForm());
    setSupplierFormError("");
    setShowSupplierForm(true);
  }

  function openEditSupplierForm(supplier) {
    setEditingSupplierId(supplier.id);
    setSupplierFormData({
      name: supplier.name,
      contactPerson: supplier.contactPerson || "",
      phone: supplier.phone,
      email: supplier.email || "",
      address: supplier.address || "",
      status: supplier.status || "Active",
      notes: supplier.notes || "",
    });
    setSupplierFormError("");
    setShowSupplierForm(true);
  }

  function closeSupplierForm() {
    setShowSupplierForm(false);
    setEditingSupplierId(null);
    setSupplierFormData(createEmptySupplierForm());
    setSupplierFormError("");
  }

  function handleSupplierSubmit(event) {
    event.preventDefault();

    if (!supplierFormData.name.trim()) {
      setSupplierFormError("Supplier name is required.");
      return;
    }

    if (!/^[0-9]{10}$/.test(supplierFormData.phone)) {
      setSupplierFormError(
        "Supplier phone number must contain exactly 10 digits."
      );
      return;
    }

    if (
      supplierFormData.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        supplierFormData.email
      )
    ) {
      setSupplierFormError(
        "Please enter a valid supplier email."
      );
      return;
    }

    const duplicate = suppliers.some(
      (supplier) =>
        supplier.name.trim().toLowerCase() ===
        supplierFormData.name.trim().toLowerCase() &&
        supplier.id !== editingSupplierId
    );

    if (duplicate) {
      setSupplierFormError(
        "A supplier with this name already exists."
      );
      return;
    }

    const supplierData = {
      name: supplierFormData.name.trim(),
      contactPerson: supplierFormData.contactPerson.trim(),
      phone: supplierFormData.phone.trim(),
      email: supplierFormData.email.trim(),
      address: supplierFormData.address.trim(),
      status: supplierFormData.status,
      notes:
        supplierFormData.notes.trim() ||
        "No additional notes.",
    };

    if (editingSupplierId) {
      setSuppliers((previous) =>
        previous.map((supplier) =>
          supplier.id === editingSupplierId
            ? { ...supplier, ...supplierData }
            : supplier
        )
      );

      setPurchases((previous) =>
        previous.map((purchase) => {
          const editedSupplier = suppliers.find(
            (supplier) => supplier.id === editingSupplierId
          );

          if (
            !editedSupplier ||
            purchase.supplierName !== editedSupplier.name
          ) {
            return purchase;
          }

          return {
            ...purchase,
            supplierName: supplierData.name,
            supplierPhone: supplierData.phone,
          };
        })
      );
    } else {
      const newSupplier = {
        id: Date.now(),
        ...supplierData,
      };

      setSuppliers((previous) => [
        newSupplier,
        ...previous,
      ]);

      setFormData((previous) => ({
        ...previous,
        supplierName: newSupplier.name,
        supplierPhone: newSupplier.phone,
      }));
    }

    closeSupplierForm();
  }

  function handleDeleteSupplier(supplierId) {
    const supplier = suppliers.find(
      (item) => item.id === supplierId
    );

    if (!supplier) return;

    const usedInPurchases = purchases.some(
      (purchase) =>
        purchase.supplierName === supplier.name
    );

    if (usedInPurchases) {
      window.alert(
        "This supplier is linked to an existing purchase and cannot be deleted."
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete ${supplier.name}?`
    );

    if (!confirmed) return;

    setSuppliers((previous) =>
      previous.filter(
        (supplierItem) =>
          supplierItem.id !== supplierId
      )
    );
  }

  function generatePurchaseNumber() {
    const highest = purchases.reduce((max, purchase) => {
      const number = Number(
        purchase.purchaseNumber.replace("PUR-", "")
      );

      return number > max ? number : max;
    }, 0);

    return `PUR-${String(highest + 1).padStart(4, "0")}`;
  }

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setFormError("");
  }

  function handleSupplierChange(event) {
    const supplierName = event.target.value;
    const supplier = suppliers.find(
      (item) => item.name === supplierName
    );

    setFormData((previous) => ({
      ...previous,
      supplierName,
      supplierPhone: supplier?.phone || "",
    }));

    setFormError("");
  }

  function handleItemChange(itemId, field, value) {
    setFormData((previous) => ({
      ...previous,
      items: previous.items.map((item) =>
        item.id === itemId
          ? {
            ...item,
            [field]: value,
          }
          : item
      ),
    }));

    setFormError("");
  }

  function addItem() {
    setFormData((previous) => ({
      ...previous,
      items: [
        ...previous.items,
        {
          id: Date.now() + Math.random(),
          ...emptyItem,
        },
      ],
    }));
  }

  function removeItem(itemId) {
    setFormData((previous) => {
      if (previous.items.length === 1) {
        return previous;
      }

      return {
        ...previous,
        items: previous.items.filter(
          (item) => item.id !== itemId
        ),
      };
    });
  }

  function openAddForm() {
    setEditingPurchaseId(null);
    setFormData(createEmptyForm());
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(purchase) {
    setEditingPurchaseId(purchase.id);

    setFormData({
      invoiceNumber: purchase.invoiceNumber,
      supplierName: purchase.supplierName,
      supplierPhone: purchase.supplierPhone,
      purchaseDate: purchase.purchaseDate,
      expectedDate: purchase.expectedDate,
      paymentMethod: purchase.paymentMethod,
      paymentStatus: purchase.paymentStatus,
      purchaseStatus: purchase.purchaseStatus,
      discount: purchase.discount,
      taxPercent: purchase.taxPercent,
      paidAmount: purchase.paidAmount,
      notes: purchase.notes,
      items: purchase.items.map((item) => ({
        ...item,
      })),
    });

    setFormError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingPurchaseId(null);
    setFormData(createEmptyForm());
    setFormError("");
  }

  function validateForm() {
    if (!formData.invoiceNumber.trim()) {
      return "Supplier invoice number is required.";
    }

    if (!formData.supplierName) {
      return "Please select a supplier.";
    }

    if (!formData.purchaseDate) {
      return "Purchase date is required.";
    }

    if (!formData.items.length) {
      return "At least one purchase item is required.";
    }

    for (const item of formData.items) {
      if (!item.itemName.trim()) {
        return "Every item must have a name.";
      }

      if (Number(item.quantity) <= 0) {
        return "Item quantity must be greater than zero.";
      }

      if (Number(item.unitPrice) < 0) {
        return "Item unit price cannot be negative.";
      }
    }

    if (Number(formData.discount) < 0) {
      return "Discount cannot be negative.";
    }

    if (Number(formData.taxPercent) < 0) {
      return "Tax percentage cannot be negative.";
    }

    if (Number(formData.paidAmount) < 0) {
      return "Paid amount cannot be negative.";
    }

    return "";
  }

  function handleSubmit(event) {
    event.preventDefault();

    const error = validateForm();

    if (error) {
      setFormError(error);
      return;
    }

    const purchaseData = {
      invoiceNumber: formData.invoiceNumber.trim(),
      supplierName: formData.supplierName,
      supplierPhone: formData.supplierPhone,
      purchaseDate: formData.purchaseDate,
      expectedDate: formData.expectedDate,
      paymentMethod: formData.paymentMethod,
      paymentStatus: formData.paymentStatus,
      purchaseStatus: formData.purchaseStatus,
      discount: Number(formData.discount) || 0,
      taxPercent: Number(formData.taxPercent) || 0,
      paidAmount: Number(formData.paidAmount) || 0,
      notes:
        formData.notes.trim() || "No additional notes.",
      items: formData.items.map((item) => ({
        id: item.id,
        itemName: item.itemName.trim(),
        category: item.category,
        quantity: Number(item.quantity) || 0,
        unit: item.unit,
        unitPrice: Number(item.unitPrice) || 0,
      })),
    };

    if (editingPurchaseId) {
      setPurchases((previous) =>
        previous.map((purchase) =>
          purchase.id === editingPurchaseId
            ? {
              ...purchase,
              ...purchaseData,
            }
            : purchase
        )
      );
    } else {
      setPurchases((previous) => [
        {
          id: Date.now(),
          purchaseNumber: generatePurchaseNumber(),
          ...purchaseData,
        },
        ...previous,
      ]);
    }

    closeForm();
  }

  function handleDelete(purchaseId) {
    const purchase = purchases.find(
      (item) => item.id === purchaseId
    );

    const confirmed = window.confirm(
      `Delete ${purchase?.purchaseNumber || "this purchase"}?`
    );

    if (!confirmed) return;

    setPurchases((previous) =>
      previous.filter(
        (purchaseItem) => purchaseItem.id !== purchaseId
      )
    );
  }

  function resetFilters() {
    setSearchTerm("");
    setSupplierFilter("All");
    setStatusFilter("All");
    setPaymentFilter("All");
  }

  function handleExport() {
    const rows = [
      [
        "Purchase Number",
        "Invoice Number",
        "Supplier",
        "Supplier Phone",
        "Purchase Date",
        "Expected Date",
        "Items",
        "Subtotal",
        "Discount",
        "Tax",
        "Grand Total",
        "Paid",
        "Due",
        "Purchase Status",
        "Payment Status",
        "Payment Method",
      ],
      ...filteredPurchases.map((purchase) => {
        const calculated = calculatePurchaseTotals(purchase);

        return [
          purchase.purchaseNumber,
          purchase.invoiceNumber,
          purchase.supplierName,
          purchase.supplierPhone,
          purchase.purchaseDate,
          purchase.expectedDate,
          purchase.items.length,
          calculated.subtotal,
          purchase.discount,
          calculated.taxAmount,
          calculated.grandTotal,
          purchase.paidAmount,
          calculated.dueAmount,
          purchase.purchaseStatus,
          purchase.paymentStatus,
          purchase.paymentMethod,
        ];
      }),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => {
            const text = String(value ?? "");
            return `"${text.replaceAll('"', '""')}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "pokhara-pet-house-purchases.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1">Purchases</h3>

          <p className="text-secondary mb-0">
            Manage supplier purchases, invoices, payments and purchased items.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-light border d-flex align-items-center gap-2"
            onClick={handleExport}
          >
            <Download size={18} />

          </button>

          <button
            type="button"
            className="btn btn-light border d-flex align-items-center gap-2"
            onClick={openAddForm}
          >
            <Plus size={18} />
            Add Purchase
          </button>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <SummaryCard
          title="Total Purchases"
          value={`NPR ${totals.totalAmount.toLocaleString()}`}
          icon={ShoppingCart}
          iconClass="bg-primary-subtle text-primary"
        />

        <SummaryCard
          title="Paid Amount"
          value={`NPR ${totals.totalPaid.toLocaleString()}`}
          icon={CheckCircle2}
          iconClass="bg-success-subtle text-success"
        />

        <SummaryCard
          title="Due Amount"
          value={`NPR ${totals.totalDue.toLocaleString()}`}
          icon={WalletCards}
          iconClass="bg-danger-subtle text-danger"
        />

        <SummaryCard
          title="Pending Orders"
          value={totals.pending}
          icon={Truck}
          iconClass="bg-warning-subtle text-warning-emphasis"
        />
      </div>

      <section className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-3 p-md-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
            <div>
              <h5 className="fw-bold mb-1">
                Supplier Management
              </h5>

              <p className="text-secondary small mb-0">
                Add and manage suppliers used for clinic purchases.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-outline-primary d-flex align-items-center justify-content-center gap-2"
              onClick={openAddSupplierForm}
            >
              <Plus size={17} />
              Add Supplier
            </button>
          </div>

          <div className="row g-3">
            {suppliers.map((supplier) => (
              <div
                className="col-md-6 col-xl-4"
                key={supplier.id}
              >
                <div className="border rounded-4 p-3 h-100">
                  <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className="rounded-3 bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{
                          width: "44px",
                          height: "44px",
                        }}
                      >
                        <Building2 size={21} />
                      </div>

                      <div>
                        <h6 className="fw-bold mb-1">
                          {supplier.name}
                        </h6>

                        <SupplierStatusBadge
                          status={supplier.status}
                        />
                      </div>
                    </div>

                    <div className="d-flex gap-1">
                      <button
                        type="button"
                        className="btn btn-sm btn-light border"
                        title="Edit supplier"
                        onClick={() =>
                          openEditSupplierForm(supplier)
                        }
                      >
                        <Edit3 size={15} />
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        title="Delete supplier"
                        onClick={() =>
                          handleDeleteSupplier(supplier.id)
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="small mb-2">
                    <strong>Contact:</strong>{" "}
                    {supplier.contactPerson ||
                      "Not provided"}
                  </div>

                  <div className="small text-secondary d-flex align-items-center gap-2 mb-2">
                    <Phone size={14} />
                    {supplier.phone}
                  </div>

                  <div className="small text-secondary d-flex align-items-center gap-2 mb-2">
                    <Mail size={14} />
                    {supplier.email || "Not provided"}
                  </div>

                  <div className="small text-secondary d-flex align-items-start gap-2">
                    <MapPin
                      size={14}
                      className="mt-1 flex-shrink-0"
                    />
                    {supplier.address || "Not provided"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-3 p-md-4">
          <div className="d-flex flex-column flex-xl-row gap-3 mb-4">
            <div className="input-group flex-grow-1">
              <span className="input-group-text bg-white border-end-0">
                <Search size={18} />
              </span>

              <input
                type="search"
                className="form-control border-start-0"
                placeholder="Search purchase number, invoice or supplier"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
              />
            </div>

            <div className="d-flex flex-column flex-sm-row gap-2">
              <select
                className="form-select"
                value={supplierFilter}
                onChange={(event) =>
                  setSupplierFilter(event.target.value)
                }
              >
                <option value="All">All suppliers</option>

                {suppliers.map((supplier) => (
                  <option
                    key={supplier.phone}
                    value={supplier.name}
                  >
                    {supplier.name}
                  </option>
                ))}
              </select>

              <select
                className="form-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="All">All purchase status</option>
                <option value="Pending">Pending</option>
                <option value="Ordered">Ordered</option>
                <option value="Received">Received</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <select
                className="form-select"
                value={paymentFilter}
                onChange={(event) =>
                  setPaymentFilter(event.target.value)
                }
              >
                <option value="All">All payment status</option>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
                <option value="Unpaid">Unpaid</option>
              </select>

              <button
                type="button"
                className="btn btn-light border text-nowrap"
                onClick={resetFilters}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mb-3">
            <small className="text-secondary">
              Showing {filteredPurchases.length} of{" "}
              {purchases.length} purchases
            </small>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Purchase</th>
                  <th>Supplier</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredPurchases.length > 0 ? (
                  filteredPurchases.map((purchase) => {
                    const calculated =
                      calculatePurchaseTotals(purchase);

                    return (
                      <tr key={purchase.id}>
                        <td>
                          <div className="fw-semibold">
                            {purchase.purchaseNumber}
                          </div>

                          <small className="text-secondary">
                            Invoice: {purchase.invoiceNumber}
                          </small>
                        </td>

                        <td>
                          <div className="fw-semibold small">
                            {purchase.supplierName}
                          </div>

                          <small className="text-secondary">
                            {purchase.supplierPhone}
                          </small>
                        </td>

                        <td>
                          <div className="small">
                            {formatDate(purchase.purchaseDate)}
                          </div>

                          <small className="text-secondary">
                            Expected:{" "}
                            {purchase.expectedDate
                              ? formatDate(purchase.expectedDate)
                              : "Not set"}
                          </small>
                        </td>

                        <td>
                          <span className="badge bg-light text-dark border rounded-pill">
                            {purchase.items.length} items
                          </span>
                        </td>

                        <td>
                          <div className="fw-semibold">
                            NPR {calculated.grandTotal.toLocaleString()}
                          </div>

                          <small className="text-danger">
                            Due: NPR{" "}
                            {calculated.dueAmount.toLocaleString()}
                          </small>
                        </td>

                        <td>
                          <PaymentBadge
                            status={purchase.paymentStatus}
                          />

                          <div>
                            <small className="text-secondary">
                              {purchase.paymentMethod}
                            </small>
                          </div>
                        </td>

                        <td>
                          <PurchaseStatusBadge
                            status={purchase.purchaseStatus}
                          />
                        </td>

                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-1">
                            <button
                              type="button"
                              className="btn btn-sm btn-light border"
                              title="View purchase"
                              onClick={() =>
                                setSelectedPurchase(purchase)
                              }
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              type="button"
                              className="btn btn-sm btn-light border"
                              title="Edit purchase"
                              onClick={() =>
                                openEditForm(purchase)
                              }
                            >
                              <Edit3 size={16} />
                            </button>

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              title="Delete purchase"
                              onClick={() =>
                                handleDelete(purchase.id)
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="8"
                      className="text-center py-5"
                    >
                      <ShoppingCart
                        size={44}
                        className="text-secondary mb-3"
                      />

                      <h6 className="fw-semibold">
                        No purchases found
                      </h6>

                      <p className="text-secondary small">
                        Change the filters or add a new purchase.
                      </p>

                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={openAddForm}
                      >
                        Add Purchase
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {showForm && (
        <PurchaseFormModal
          formData={formData}
          formError={formError}
          editing={Boolean(editingPurchaseId)}
          onChange={handleInputChange}
          suppliers={suppliers}
          onSupplierChange={handleSupplierChange}
          onOpenSupplierForm={openAddSupplierForm}
          onItemChange={handleItemChange}
          onAddItem={addItem}
          onRemoveItem={removeItem}
          onSubmit={handleSubmit}
          onClose={closeForm}
        />
      )}

      {showSupplierForm && (
        <SupplierFormModal
          formData={supplierFormData}
          formError={supplierFormError}
          editing={Boolean(editingSupplierId)}
          onChange={handleSupplierFormChange}
          onSubmit={handleSupplierSubmit}
          onClose={closeSupplierForm}
        />
      )}

      {selectedPurchase && (
        <PurchaseDetailsModal
          purchase={selectedPurchase}
          onClose={() => setSelectedPurchase(null)}
          onEdit={() => {
            openEditForm(selectedPurchase);
            setSelectedPurchase(null);
          }}
        />
      )}
    </div>
  );
}

function SupplierFormModal({
  formData,
  formError,
  editing,
  onChange,
  onSubmit,
  onClose,
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="supplier-form-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backgroundColor: "rgba(0, 0, 0, 0.58)",
        overflow: "hidden",
      }}
    >
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-4 shadow-lg"
        style={{
          width: "min(760px, 100%)",
          maxHeight: "calc(100vh - 32px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          className="border-bottom p-3 p-md-4 d-flex justify-content-between align-items-start gap-3"
          style={{ flexShrink: 0 }}
        >
          <div>
            <h5
              id="supplier-form-title"
              className="fw-bold mb-1"
            >
              {editing ? "Edit Supplier" : "Add Supplier"}
            </h5>

            <small className="text-secondary">
              Enter supplier contact and business information.
            </small>
          </div>

          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            aria-label="Close"
          />
        </div>

        <div
          className="p-3 p-md-4"
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {formError && (
            <div className="alert alert-danger">
              {formError}
            </div>
          )}

          <div className="row g-3">
            <FormInput
              label="Supplier Name"
              name="name"
              value={formData.name}
              onChange={onChange}
              required
              col="col-md-6"
            />

            <FormInput
              label="Contact Person"
              name="contactPerson"
              value={formData.contactPerson}
              onChange={onChange}
              col="col-md-6"
            />

            <FormInput
              label="Phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={onChange}
              placeholder="98XXXXXXXX"
              required
              col="col-md-6"
            />

            <FormInput
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={onChange}
              col="col-md-6"
            />

            <FormInput
              label="Address"
              name="address"
              value={formData.address}
              onChange={onChange}
              col="col-md-8"
            />

            <FormSelect
              label="Status"
              name="status"
              value={formData.status}
              onChange={onChange}
              options={["Active", "Inactive"]}
              col="col-md-4"
            />

            <div className="col-12">
              <label className="form-label">Notes</label>

              <textarea
                className="form-control"
                name="notes"
                rows="4"
                value={formData.notes}
                onChange={onChange}
                placeholder="Products supplied, payment terms or other information"
              />
            </div>
          </div>
        </div>

        <div
          className="border-top p-3 d-flex justify-content-end gap-2"
          style={{
            flexShrink: 0,
            backgroundColor: "#fff",
          }}
        >
          <button
            type="button"
            className="btn btn-light border"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn btn-primary"
          >
            {editing ? "Update Supplier" : "Save Supplier"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PurchaseFormModal({
  formData,
  formError,
  editing,
  onChange,
  suppliers,
  onSupplierChange,
  onOpenSupplierForm,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onSubmit,
  onClose,
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const calculated = calculatePurchaseTotals(formData);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="purchase-form-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        overflow: "hidden",
      }}
    >
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-4 shadow-lg"
        style={{
          width: "min(1200px, 100%)",
          height: "calc(100vh - 32px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          className="border-bottom p-3 p-md-4 d-flex justify-content-between align-items-start gap-3"
          style={{ flexShrink: 0 }}
        >
          <div>
            <h5
              id="purchase-form-title"
              className="fw-bold mb-1"
            >
              {editing ? "Edit Purchase" : "Add Purchase"}
            </h5>

            <small className="text-secondary">
              Enter supplier, invoice, item and payment details.
            </small>
          </div>

          <button
            type="button"
            className="btn-close flex-shrink-0"
            onClick={onClose}
            aria-label="Close"
          />
        </div>

        <div
          className="p-3 p-md-4"
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
          }}
        >
          {formError && (
            <div className="alert alert-danger">
              {formError}
            </div>
          )}

          <FormSection title="Supplier and invoice">
            <div className="row g-3">
              <FormInput
                label="Supplier Invoice Number"
                name="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={onChange}
                required
                col="col-md-4"
              />

              <div className="col-md-4">
                <label className="form-label">
                  Supplier
                  <span className="text-danger ms-1">*</span>
                </label>

                <select
                  className="form-select"
                  name="supplierName"
                  value={formData.supplierName}
                  onChange={onSupplierChange}
                  required
                >
                  <option value="">Select supplier</option>

                  {suppliers.map((supplier) => (
                    <option
                      key={supplier.phone}
                      value={supplier.name}
                    >
                      {supplier.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="btn btn-link btn-sm px-0 mt-1 text-decoration-none"
                  onClick={onOpenSupplierForm}
                >
                  <Plus size={14} className="me-1" />
                  Add new supplier
                </button>
              </div>

              <FormInput
                label="Supplier Phone"
                name="supplierPhone"
                value={formData.supplierPhone}
                readOnly
                col="col-md-4"
              />

              <FormInput
                label="Purchase Date"
                name="purchaseDate"
                type="date"
                value={formData.purchaseDate}
                onChange={onChange}
                required
                col="col-md-4"
              />

              <FormInput
                label="Expected Delivery Date"
                name="expectedDate"
                type="date"
                value={formData.expectedDate}
                onChange={onChange}
                col="col-md-4"
              />

              <FormSelect
                label="Purchase Status"
                name="purchaseStatus"
                value={formData.purchaseStatus}
                onChange={onChange}
                options={[
                  "Pending",
                  "Ordered",
                  "Received",
                  "Cancelled",
                ]}
                col="col-md-4"
              />
            </div>
          </FormSection>

          <FormSection title="Purchase items">
            <div className="d-flex justify-content-end mb-3">
              <button
                type="button"
                className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
                onClick={onAddItem}
              >
                <PackagePlus size={16} />
                Add Item
              </button>
            </div>

            <div className="d-flex flex-column gap-3">
              {formData.items.map((item, index) => (
                <div
                  key={item.id}
                  className="border rounded-4 p-3"
                >
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold mb-0">
                      Item {index + 1}
                    </h6>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => onRemoveItem(item.id)}
                      disabled={formData.items.length === 1}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="row g-3">
                    <FormInput
                      label="Item Name"
                      value={item.itemName}
                      onChange={(event) =>
                        onItemChange(
                          item.id,
                          "itemName",
                          event.target.value
                        )
                      }
                      required
                      col="col-md-4"
                    />

                    <FormSelect
                      label="Category"
                      value={item.category}
                      onChange={(event) =>
                        onItemChange(
                          item.id,
                          "category",
                          event.target.value
                        )
                      }
                      options={categoryOptions}
                      col="col-md-2"
                    />

                    <FormInput
                      label="Quantity"
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(event) =>
                        onItemChange(
                          item.id,
                          "quantity",
                          event.target.value
                        )
                      }
                      required
                      col="col-md-2"
                    />

                    <FormSelect
                      label="Unit"
                      value={item.unit}
                      onChange={(event) =>
                        onItemChange(
                          item.id,
                          "unit",
                          event.target.value
                        )
                      }
                      options={unitOptions}
                      col="col-md-2"
                    />

                    <FormInput
                      label="Unit Price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(event) =>
                        onItemChange(
                          item.id,
                          "unitPrice",
                          event.target.value
                        )
                      }
                      required
                      col="col-md-2"
                    />
                  </div>

                  <div className="text-end mt-3">
                    <small className="text-secondary">
                      Line total:{" "}
                      <strong className="text-dark">
                        NPR{" "}
                        {(
                          Number(item.quantity || 0) *
                          Number(item.unitPrice || 0)
                        ).toLocaleString()}
                      </strong>
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection title="Payment and totals">
            <div className="row g-3">
              <FormSelect
                label="Payment Method"
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={onChange}
                options={[
                  "Cash",
                  "Bank Transfer",
                  "Cheque",
                  "Credit",
                  "Mobile Payment",
                ]}
                col="col-md-3"
              />

              <FormSelect
                label="Payment Status"
                name="paymentStatus"
                value={formData.paymentStatus}
                onChange={onChange}
                options={["Paid", "Partial", "Unpaid"]}
                col="col-md-3"
              />

              <FormInput
                label="Discount"
                name="discount"
                type="number"
                min="0"
                step="0.01"
                value={formData.discount}
                onChange={onChange}
                col="col-md-2"
              />

              <FormInput
                label="Tax %"
                name="taxPercent"
                type="number"
                min="0"
                step="0.01"
                value={formData.taxPercent}
                onChange={onChange}
                col="col-md-2"
              />

              <FormInput
                label="Paid Amount"
                name="paidAmount"
                type="number"
                min="0"
                step="0.01"
                value={formData.paidAmount}
                onChange={onChange}
                col="col-md-2"
              />

              <div className="col-12">
                <div className="bg-light rounded-4 p-3">
                  <div className="row g-3 text-center">
                    <TotalBox
                      label="Subtotal"
                      value={calculated.subtotal}
                    />
                    <TotalBox
                      label="Discount"
                      value={calculated.discount}
                    />
                    <TotalBox
                      label="Tax"
                      value={calculated.taxAmount}
                    />
                    <TotalBox
                      label="Grand Total"
                      value={calculated.grandTotal}
                    />
                    <TotalBox
                      label="Due Amount"
                      value={calculated.dueAmount}
                      danger
                    />
                  </div>
                </div>
              </div>

              <div className="col-12">
                <label className="form-label">Notes</label>

                <textarea
                  className="form-control"
                  name="notes"
                  rows="4"
                  value={formData.notes}
                  onChange={onChange}
                  placeholder="Delivery instructions, payment terms or other notes"
                />
              </div>
            </div>
          </FormSection>
        </div>

        <div
          className="border-top p-3 d-flex justify-content-end gap-2"
          style={{
            flexShrink: 0,
            backgroundColor: "#fff",
          }}
        >
          <button
            type="button"
            className="btn btn-light border"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn btn-primary"
          >
            {editing ? "Update Purchase" : "Save Purchase"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PurchaseDetailsModal({
  purchase,
  onClose,
  onEdit,
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const calculated = calculatePurchaseTotals(purchase);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        overflow: "hidden",
      }}
    >
      <div
        className="bg-white rounded-4 shadow-lg"
        style={{
          width: "min(950px, 100%)",
          maxHeight: "calc(100vh - 32px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          className="border-bottom p-3 p-md-4 d-flex justify-content-between align-items-start gap-3"
          style={{ flexShrink: 0 }}
        >
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center"
              style={{
                width: "52px",
                height: "52px",
              }}
            >
              <FileText size={24} />
            </div>

            <div>
              <h5 className="fw-bold mb-1">
                {purchase.purchaseNumber}
              </h5>

              <small className="text-secondary">
                Supplier invoice: {purchase.invoiceNumber}
              </small>
            </div>
          </div>

          <button
            type="button"
            className="btn-close"
            onClick={onClose}
          />
        </div>

        <div
          className="p-3 p-md-4"
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
          }}
        >
          <div className="d-flex flex-wrap gap-2 mb-4">
            <PurchaseStatusBadge
              status={purchase.purchaseStatus}
            />
            <PaymentBadge status={purchase.paymentStatus} />

            <span className="badge bg-light text-dark border rounded-pill">
              {purchase.paymentMethod}
            </span>
          </div>

          <div className="row g-4 mb-4">
            <div className="col-md-6">
              <h6 className="fw-bold">Supplier Information</h6>

              <DetailRow
                label="Supplier"
                value={purchase.supplierName}
              />
              <DetailRow
                label="Phone"
                value={purchase.supplierPhone}
              />
              <DetailRow
                label="Purchase Date"
                value={formatDate(purchase.purchaseDate)}
              />
              <DetailRow
                label="Expected Date"
                value={
                  purchase.expectedDate
                    ? formatDate(purchase.expectedDate)
                    : "Not set"
                }
              />
            </div>

            <div className="col-md-6">
              <h6 className="fw-bold">Payment Summary</h6>

              <DetailRow
                label="Subtotal"
                value={`NPR ${calculated.subtotal.toLocaleString()}`}
              />
              <DetailRow
                label="Discount"
                value={`NPR ${calculated.discount.toLocaleString()}`}
              />
              <DetailRow
                label="Tax"
                value={`NPR ${calculated.taxAmount.toLocaleString()}`}
              />
              <DetailRow
                label="Grand Total"
                value={`NPR ${calculated.grandTotal.toLocaleString()}`}
              />
              <DetailRow
                label="Paid"
                value={`NPR ${Number(
                  purchase.paidAmount
                ).toLocaleString()}`}
              />
              <DetailRow
                label="Due"
                value={`NPR ${calculated.dueAmount.toLocaleString()}`}
              />
            </div>
          </div>

          <h6 className="fw-bold mb-3">Purchased Items</h6>

          <div className="table-responsive mb-4">
            <table className="table table-bordered align-middle">
              <thead className="table-light">
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                {purchase.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.itemName}</td>
                    <td>{item.category}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unit}</td>
                    <td>
                      NPR {Number(item.unitPrice).toLocaleString()}
                    </td>
                    <td className="fw-semibold">
                      NPR{" "}
                      {(
                        Number(item.quantity) *
                        Number(item.unitPrice)
                      ).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border rounded-4 p-3">
            <h6 className="fw-bold mb-2">Notes</h6>
            <p className="text-secondary small mb-0">
              {purchase.notes}
            </p>
          </div>
        </div>

        <div
          className="border-top p-3 d-flex justify-content-end gap-2"
          style={{ flexShrink: 0 }}
        >
          <button
            type="button"
            className="btn btn-light border"
            onClick={onClose}
          >
            Close
          </button>

          <button
            type="button"
            className="btn btn-primary d-flex align-items-center gap-2"
            onClick={onEdit}
          >
            <Edit3 size={16} />
            Edit Purchase
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  iconClass,
}) {
  return (
    <div className="col-sm-6 col-xl-3">
      <div className="card border-0 shadow-sm rounded-4 h-100">
        <div className="card-body d-flex justify-content-between align-items-center gap-3">
          <div>
            <small className="text-secondary">{title}</small>
            <h4 className="fw-bold mt-2 mb-0">{value}</h4>
          </div>

          <div
            className={`rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 ${iconClass}`}
            style={{
              width: "48px",
              height: "48px",
            }}
          >
            <Icon size={22} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FormSection({ title, children }) {
  return (
    <section className="mb-4">
      <h6 className="fw-bold border-bottom pb-2 mb-3">
        {title}
      </h6>
      {children}
    </section>
  );
}

function FormInput({
  label,
  col = "col-12",
  ...inputProps
}) {
  return (
    <div className={col}>
      <label className="form-label">
        {label}
        {inputProps.required && (
          <span className="text-danger ms-1">*</span>
        )}
      </label>

      <input
        className="form-control"
        {...inputProps}
      />
    </div>
  );
}

function FormSelect({
  label,
  options,
  col = "col-12",
  ...selectProps
}) {
  return (
    <div className={col}>
      <label className="form-label">{label}</label>

      <select
        className="form-select"
        {...selectProps}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function TotalBox({ label, value, danger }) {
  return (
    <div className="col-6 col-md">
      <small className="text-secondary d-block">
        {label}
      </small>

      <strong className={danger ? "text-danger" : ""}>
        NPR {Number(value).toLocaleString()}
      </strong>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="d-flex justify-content-between gap-3 border-bottom py-2">
      <small className="text-secondary">{label}</small>
      <small className="fw-semibold text-end">{value}</small>
    </div>
  );
}

function SupplierStatusBadge({ status }) {
  const classes = {
    Active: "bg-success-subtle text-success",
    Inactive: "bg-secondary-subtle text-secondary",
  };

  return (
    <span
      className={`badge rounded-pill ${classes[status] || "bg-light text-secondary"
        }`}
    >
      {status}
    </span>
  );
}

function PaymentBadge({ status }) {
  const classes = {
    Paid: "bg-success-subtle text-success",
    Partial: "bg-warning-subtle text-warning-emphasis",
    Unpaid: "bg-danger-subtle text-danger",
  };

  return (
    <span
      className={`badge rounded-pill ${classes[status] || "bg-light text-secondary"
        }`}
    >
      {status}
    </span>
  );
}

function PurchaseStatusBadge({ status }) {
  const classes = {
    Pending: "bg-warning-subtle text-warning-emphasis",
    Ordered: "bg-info-subtle text-info-emphasis",
    Received: "bg-success-subtle text-success",
    Cancelled: "bg-danger-subtle text-danger",
  };

  return (
    <span
      className={`badge rounded-pill ${classes[status] || "bg-light text-secondary"
        }`}
    >
      {status}
    </span>
  );
}

function calculatePurchaseTotals(purchase) {
  const subtotal = (purchase.items || []).reduce(
    (sum, item) =>
      sum +
      Number(item.quantity || 0) *
      Number(item.unitPrice || 0),
    0
  );

  const discount = Math.min(
    Number(purchase.discount || 0),
    subtotal
  );

  const taxableAmount = Math.max(subtotal - discount, 0);
  const taxAmount =
    taxableAmount *
    (Number(purchase.taxPercent || 0) / 100);

  const grandTotal = taxableAmount + taxAmount;
  const paidAmount = Number(purchase.paidAmount || 0);
  const dueAmount = Math.max(grandTotal - paidAmount, 0);

  return {
    subtotal,
    discount,
    taxAmount,
    grandTotal,
    dueAmount,
  };
}

function formatDate(date) {
  if (!date) return "Not set";

  return new Date(`${date}T00:00:00`).toLocaleDateString();
}

export default Purchases;
