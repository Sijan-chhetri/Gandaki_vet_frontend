import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Banknote,
  CalendarDays,
  Download,
  Eye,
  Plus,
  ReceiptText,
  Search,
  ShoppingBag,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";

const initialSales = [
  {
    id: 1,
    invoiceNumber: "INV-1001",
    customerName: "Ramesh Thapa",
    customerPhone: "9841234567",
    patientName: "Bruno",
    saleDate: "2026-07-21",
    paymentMethod: "Cash",
    paymentStatus: "Paid",
    saleStatus: "Completed",
    discount: 100,
    tax: 0,
    notes: "Routine consultation and medicines.",
    items: [
      {
        id: 1,
        name: "Consultation Fee",
        category: "Service",
        quantity: 1,
        price: 800,
      },
      {
        id: 2,
        name: "Deworming Tablet",
        category: "Medicine",
        quantity: 2,
        price: 250,
      },
    ],
  },
  {
    id: 2,
    invoiceNumber: "INV-1002",
    customerName: "Sita Gurung",
    customerPhone: "9800000001",
    patientName: "Milo",
    saleDate: "2026-07-21",
    paymentMethod: "eSewa",
    paymentStatus: "Paid",
    saleStatus: "Completed",
    discount: 0,
    tax: 50,
    notes: "",
    items: [
      {
        id: 1,
        name: "Vaccination",
        category: "Service",
        quantity: 1,
        price: 1200,
      },
    ],
  },
  {
    id: 3,
    invoiceNumber: "INV-1003",
    customerName: "Bikash Karki",
    customerPhone: "9812345678",
    patientName: "Lucy",
    saleDate: "2026-07-20",
    paymentMethod: "Credit",
    paymentStatus: "Pending",
    saleStatus: "Pending",
    discount: 0,
    tax: 0,
    notes: "Payment expected next week.",
    items: [
      {
        id: 1,
        name: "Pet Food",
        category: "Product",
        quantity: 2,
        price: 1450,
      },
    ],
  },
];

const emptyItem = {
  id: Date.now(),
  name: "",
  category: "Product",
  quantity: 1,
  price: "",
};

const emptySale = {
  customerName: "",
  customerPhone: "",
  patientName: "",
  saleDate: new Date().toISOString().split("T")[0],
  paymentMethod: "Cash",
  paymentStatus: "Paid",
  saleStatus: "Completed",
  discount: 0,
  tax: 0,
  notes: "",
  items: [{ ...emptyItem }],
};

function getItemsSubtotal(items = []) {
  return items.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0) * Number(item.price || 0),
    0
  );
}

function getSaleTotal(sale) {
  const subtotal = getItemsSubtotal(sale.items);
  const discount = Number(sale.discount || 0);
  const tax = Number(sale.tax || 0);

  return Math.max(subtotal - discount + tax, 0);
}

function generateInvoiceNumber(sales) {
  const highestNumber = sales.reduce((highest, sale) => {
    const number = Number(
      String(sale.invoiceNumber || "").replace(/\D/g, "")
    );

    return Number.isNaN(number)
      ? highest
      : Math.max(highest, number);
  }, 1000);

  return `INV-${highestNumber + 1}`;
}

function Sales() {
  const [sales, setSales] = useState(() => {
    const savedSales = localStorage.getItem("veterinarySales");

    return savedSales
      ? JSON.parse(savedSales)
      : initialSales;
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");

  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] =
    useState(false);

  const [selectedSale, setSelectedSale] = useState(null);
  const [formData, setFormData] = useState(emptySale);
  const [formError, setFormError] = useState("");


  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem(
      "veterinarySales",
      JSON.stringify(sales)
    );
  }, [sales]);

  useEffect(() => {
    if (location.state?.action === "add") {
      openAddModal();

      navigate(location.pathname, {
        replace: true,
        state: null,
      });
    }
  }, [location.state]);

  const filteredSales = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();

    return sales.filter((sale) => {
      const matchesSearch =
        !query ||
        sale.invoiceNumber.toLowerCase().includes(query) ||
        sale.customerName.toLowerCase().includes(query) ||
        sale.customerPhone.toLowerCase().includes(query) ||
        sale.patientName.toLowerCase().includes(query);

      const matchesPayment =
        paymentFilter === "All" ||
        sale.paymentMethod === paymentFilter;

      const matchesStatus =
        statusFilter === "All" ||
        sale.paymentStatus === statusFilter;

      const matchesDate =
        !dateFilter || sale.saleDate === dateFilter;

      return (
        matchesSearch &&
        matchesPayment &&
        matchesStatus &&
        matchesDate
      );
    });
  }, [
    sales,
    searchTerm,
    paymentFilter,
    statusFilter,
    dateFilter,
  ]);

  const statistics = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];

    const totalRevenue = sales
      .filter((sale) => sale.paymentStatus === "Paid")
      .reduce((sum, sale) => sum + getSaleTotal(sale), 0);

    const todaySales = sales
      .filter(
        (sale) =>
          sale.saleDate === today &&
          sale.paymentStatus === "Paid"
      )
      .reduce((sum, sale) => sum + getSaleTotal(sale), 0);

    const pendingAmount = sales
      .filter((sale) => sale.paymentStatus === "Pending")
      .reduce((sum, sale) => sum + getSaleTotal(sale), 0);

    return {
      totalRevenue,
      todaySales,
      pendingAmount,
      totalInvoices: sales.length,
    };
  }, [sales]);

  const openAddModal = () => {
    setSelectedSale(null);
    setFormData({
      ...emptySale,
      saleDate: new Date().toISOString().split("T")[0],
      items: [
        {
          ...emptyItem,
          id: Date.now(),
        },
      ],
    });
    setFormError("");
    setShowSaleModal(true);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleItemChange = (id, field, value) => {
    setFormData((previous) => ({
      ...previous,
      items: previous.items.map((item) =>
        item.id === id
          ? {
            ...item,
            [field]: value,
          }
          : item
      ),
    }));
  };

  const addSaleItem = () => {
    setFormData((previous) => ({
      ...previous,
      items: [
        ...previous.items,
        {
          id: Date.now(),
          name: "",
          category: "Product",
          quantity: 1,
          price: "",
        },
      ],
    }));
  };

  const removeSaleItem = (id) => {
    setFormData((previous) => ({
      ...previous,
      items:
        previous.items.length === 1
          ? previous.items
          : previous.items.filter(
            (item) => item.id !== id
          ),
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setFormError("");

    if (!formData.customerName.trim()) {
      setFormError("Customer name is required.");
      return;
    }

    if (!formData.saleDate) {
      setFormError("Sale date is required.");
      return;
    }

    const validItems = formData.items.filter(
      (item) =>
        item.name.trim() &&
        Number(item.quantity) > 0 &&
        Number(item.price) >= 0
    );

    if (validItems.length === 0) {
      setFormError(
        "Add at least one valid product or service."
      );
      return;
    }

    const newSale = {
      ...formData,
      id: Date.now(),
      invoiceNumber: generateInvoiceNumber(sales),
      discount: Number(formData.discount || 0),
      tax: Number(formData.tax || 0),
      items: validItems.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        price: Number(item.price),
      })),
    };

    setSales((previous) => [newSale, ...previous]);
    setShowSaleModal(false);
  };

  const deleteSale = (saleId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this sale?"
    );

    if (!confirmed) return;

    setSales((previous) =>
      previous.filter((sale) => sale.id !== saleId)
    );
  };

  const openDetails = (sale) => {
    setSelectedSale(sale);
    setShowDetailsModal(true);
  };

  const markAsPaid = (saleId) => {
    setSales((previous) =>
      previous.map((sale) =>
        sale.id === saleId
          ? {
            ...sale,
            paymentStatus: "Paid",
            saleStatus: "Completed",
          }
          : sale
      )
    );
  };

  const handleExport = () => {
    if (filteredSales.length === 0) {
      window.alert("There are no sales to export.");
      return;
    }

    const headers = [
      "Invoice",
      "Date",
      "Customer",
      "Phone",
      "Patient",
      "Payment Method",
      "Payment Status",
      "Total",
    ];

    const rows = filteredSales.map((sale) => [
      sale.invoiceNumber,
      sale.saleDate,
      sale.customerName,
      sale.customerPhone,
      sale.patientName,
      sale.paymentMethod,
      sale.paymentStatus,
      getSaleTotal(sale),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "veterinary-sales.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="d-flex flex-column flex-xl-row justify-content-between align-items-xl-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            Sales Management
          </h3>

          <p className="text-secondary mb-0">
            Manage invoices, product sales and clinic payments.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-white bg-white border d-flex align-items-center gap-2"
            onClick={handleExport}
          >
            <Download size={17} />

          </button>

          <button
            type="button"
            className="btn btn-light border d-flex align-items-center gap-2"
            onClick={openAddModal}
          >
            <Plus size={18} />
            New Sale
          </button>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-xl-3">
          <SummaryCard
            title="Total Revenue"
            value={`Rs. ${statistics.totalRevenue.toLocaleString()}`}
            icon={TrendingUp}
            subtitle="Paid sales"
          />
        </div>

        <div className="col-sm-6 col-xl-3">
          <SummaryCard
            title="Today's Sales"
            value={`Rs. ${statistics.todaySales.toLocaleString()}`}
            icon={Banknote}
            subtitle="Revenue today"
          />
        </div>

        <div className="col-sm-6 col-xl-3">
          <SummaryCard
            title="Pending Amount"
            value={`Rs. ${statistics.pendingAmount.toLocaleString()}`}
            icon={ShoppingBag}
            subtitle="Awaiting payment"
          />
        </div>

        <div className="col-sm-6 col-xl-3">
          <SummaryCard
            title="Total Invoices"
            value={statistics.totalInvoices}
            icon={ReceiptText}
            subtitle="All sales records"
          />
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-lg-5">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <Search size={18} />
                </span>

                <input
                  type="search"
                  className="form-control border-start-0"
                  placeholder="Search invoice, customer or patient..."
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                />
              </div>
            </div>

            <div className="col-sm-6 col-lg-2">
              <select
                className="form-select"
                value={paymentFilter}
                onChange={(event) =>
                  setPaymentFilter(event.target.value)
                }
              >
                <option value="All">
                  All Payments
                </option>
                <option value="Cash">Cash</option>
                <option value="eSewa">eSewa</option>
                <option value="Khalti">Khalti</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">
                  Bank Transfer
                </option>
                <option value="Credit">Credit</option>
              </select>
            </div>

            <div className="col-sm-6 col-lg-2">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="All">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Partially Paid">
                  Partially Paid
                </option>
                <option value="Refunded">Refunded</option>
              </select>
            </div>

            <div className="col-lg-3">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <CalendarDays size={17} />
                </span>

                <input
                  type="date"
                  className="form-control"
                  value={dateFilter}
                  onChange={(event) =>
                    setDateFilter(event.target.value)
                  }
                />

                {dateFilter && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setDateFilter("")}
                  >
                    <X size={17} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-header bg-white border-0 px-4 py-3">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="fw-bold mb-1">
                Sales Records
              </h5>

              <small className="text-secondary">
                {filteredSales.length} sales found
              </small>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Patient</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Total</th>
                <th className="text-end px-4">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredSales.length > 0 ? (
                filteredSales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="px-4">
                      <div className="fw-semibold text-primary">
                        {sale.invoiceNumber}
                      </div>

                      <small className="text-secondary">
                        {sale.items.length} item
                        {sale.items.length !== 1 ? "s" : ""}
                      </small>
                    </td>

                    <td>{formatDate(sale.saleDate)}</td>

                    <td>
                      <div className="fw-semibold">
                        {sale.customerName}
                      </div>

                      <small className="text-secondary">
                        {sale.customerPhone || "No phone"}
                      </small>
                    </td>

                    <td>{sale.patientName || "—"}</td>

                    <td>
                      <span className="badge bg-light text-dark border">
                        {sale.paymentMethod}
                      </span>
                    </td>

                    <td>
                      <PaymentStatusBadge
                        status={sale.paymentStatus}
                      />
                    </td>

                    <td className="fw-bold">
                      Rs. {getSaleTotal(sale).toLocaleString()}
                    </td>

                    <td className="text-end px-4">
                      <div className="d-inline-flex gap-2">
                        {sale.paymentStatus === "Pending" && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            onClick={() =>
                              markAsPaid(sale.id)
                            }
                          >
                            Mark Paid
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn btn-sm btn-light border"
                          onClick={() => openDetails(sale)}
                          aria-label="View sale"
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          type="button"
                          className="btn btn-sm btn-light border text-danger"
                          onClick={() => deleteSale(sale.id)}
                          aria-label="Delete sale"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    <ReceiptText
                      size={42}
                      className="text-secondary mb-3"
                    />

                    <h6 className="fw-bold">
                      No sales records found
                    </h6>

                    <p className="text-secondary mb-0">
                      Try changing the filters or add a new sale.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showSaleModal && (
        <SaleFormModal
          formData={formData}
          formError={formError}
          onClose={() => setShowSaleModal(false)}
          onSubmit={handleSubmit}
          onChange={handleFormChange}
          onItemChange={handleItemChange}
          onAddItem={addSaleItem}
          onRemoveItem={removeSaleItem}
        />
      )}

      {showDetailsModal && selectedSale && (
        <SaleDetailsModal
          sale={selectedSale}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
}) {
  return (
    <div className="card border-0 shadow-sm rounded-4 h-100">
      <div className="card-body p-4">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <p className="text-secondary small mb-2">
              {title}
            </p>

            <h4 className="fw-bold mb-1">
              {value}
            </h4>

            <small className="text-secondary">
              {subtitle}
            </small>
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

function SaleFormModal({
  formData,
  formError,
  onClose,
  onSubmit,
  onChange,
  onItemChange,
  onAddItem,
  onRemoveItem,
}) {
  const subtotal = getItemsSubtotal(formData.items);
  const total = getSaleTotal(formData);

  return (
    <div
      className="modal d-block"
      tabIndex="-1"
      style={{
        background: "rgba(0,0,0,0.5)",
        zIndex: 1100,
      }}
    >
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <form
          className="modal-content border-0 rounded-4"
          onSubmit={onSubmit}
        >
          <div className="modal-header px-4 py-3">
            <div>
              <h5 className="modal-title fw-bold">
                Create New Sale
              </h5>

              <small className="text-secondary">
                Add customer, invoice items and payment information.
              </small>
            </div>

            <button
              type="button"
              className="btn-close"
              onClick={onClose}
            />
          </div>

          <div className="modal-body p-4">
            {formError && (
              <div className="alert alert-danger">
                {formError}
              </div>
            )}

            <FormSection title="Customer Information">
              <div className="row g-3">
                <div className="col-md-6">
                  <FormInput
                    label="Customer Name"
                    name="customerName"
                    value={formData.customerName}
                    onChange={onChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <FormInput
                    label="Phone Number"
                    name="customerPhone"
                    value={formData.customerPhone}
                    onChange={onChange}
                  />
                </div>

                <div className="col-md-6">
                  <FormInput
                    label="Patient Name"
                    name="patientName"
                    value={formData.patientName}
                    onChange={onChange}
                  />
                </div>

                <div className="col-md-6">
                  <FormInput
                    label="Sale Date"
                    name="saleDate"
                    type="date"
                    value={formData.saleDate}
                    onChange={onChange}
                    required
                  />
                </div>
              </div>
            </FormSection>

            <FormSection title="Products and Services">
              <div className="d-flex flex-column gap-3">
                {formData.items.map((item, index) => (
                  <div
                    className="border rounded-3 p-3"
                    key={item.id}
                  >
                    <div className="row g-3 align-items-end">
                      <div className="col-lg-4">
                        <FormInput
                          label={`Item ${index + 1}`}
                          value={item.name}
                          onChange={(event) =>
                            onItemChange(
                              item.id,
                              "name",
                              event.target.value
                            )
                          }
                          placeholder="Product or service name"
                        />
                      </div>

                      <div className="col-sm-6 col-lg-2">
                        <label className="form-label">
                          Category
                        </label>

                        <select
                          className="form-select"
                          value={item.category}
                          onChange={(event) =>
                            onItemChange(
                              item.id,
                              "category",
                              event.target.value
                            )
                          }
                        >
                          <option value="Product">
                            Product
                          </option>
                          <option value="Medicine">
                            Medicine
                          </option>
                          <option value="Service">
                            Service
                          </option>
                          <option value="Laboratory">
                            Laboratory
                          </option>
                        </select>
                      </div>

                      <div className="col-sm-4 col-lg-2">
                        <FormInput
                          label="Quantity"
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(event) =>
                            onItemChange(
                              item.id,
                              "quantity",
                              event.target.value
                            )
                          }
                        />
                      </div>

                      <div className="col-sm-5 col-lg-2">
                        <FormInput
                          label="Price"
                          type="number"
                          min="0"
                          value={item.price}
                          onChange={(event) =>
                            onItemChange(
                              item.id,
                              "price",
                              event.target.value
                            )
                          }
                        />
                      </div>

                      <div className="col-sm-3 col-lg-1">
                        <div className="small text-secondary mb-2">
                          Amount
                        </div>

                        <div className="fw-semibold pb-2">
                          Rs.{" "}
                          {(
                            Number(item.quantity || 0) *
                            Number(item.price || 0)
                          ).toLocaleString()}
                        </div>
                      </div>

                      <div className="col-lg-1">
                        <button
                          type="button"
                          className="btn btn-outline-danger w-100"
                          onClick={() =>
                            onRemoveItem(item.id)
                          }
                          disabled={
                            formData.items.length === 1
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="btn btn-outline-primary align-self-start d-flex align-items-center gap-2"
                  onClick={onAddItem}
                >
                  <Plus size={17} />
                  Add Item
                </button>
              </div>
            </FormSection>

            <FormSection title="Payment Information">
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">
                    Payment Method
                  </label>

                  <select
                    className="form-select"
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={onChange}
                  >
                    <option value="Cash">Cash</option>
                    <option value="eSewa">eSewa</option>
                    <option value="Khalti">Khalti</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">
                      Bank Transfer
                    </option>
                    <option value="Credit">Credit</option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label">
                    Payment Status
                  </label>

                  <select
                    className="form-select"
                    name="paymentStatus"
                    value={formData.paymentStatus}
                    onChange={onChange}
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Partially Paid">
                      Partially Paid
                    </option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label">
                    Sale Status
                  </label>

                  <select
                    className="form-select"
                    name="saleStatus"
                    value={formData.saleStatus}
                    onChange={onChange}
                  >
                    <option value="Completed">
                      Completed
                    </option>
                    <option value="Pending">Pending</option>
                    <option value="Cancelled">
                      Cancelled
                    </option>
                  </select>
                </div>

                <div className="col-md-4">
                  <FormInput
                    label="Discount"
                    name="discount"
                    type="number"
                    min="0"
                    value={formData.discount}
                    onChange={onChange}
                  />
                </div>

                <div className="col-md-4">
                  <FormInput
                    label="Tax"
                    name="tax"
                    type="number"
                    min="0"
                    value={formData.tax}
                    onChange={onChange}
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">
                    Invoice Total
                  </label>

                  <div className="form-control bg-light fw-bold">
                    Rs. {total.toLocaleString()}
                  </div>
                </div>

                <div className="col-12">
                  <label className="form-label">
                    Notes
                  </label>

                  <textarea
                    className="form-control"
                    rows="3"
                    name="notes"
                    value={formData.notes}
                    onChange={onChange}
                    placeholder="Optional sale notes..."
                  />
                </div>
              </div>

              <div className="border rounded-3 bg-light p-3 mt-4">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-secondary">
                    Subtotal
                  </span>
                  <span>
                    Rs. {subtotal.toLocaleString()}
                  </span>
                </div>

                <div className="d-flex justify-content-between mb-2">
                  <span className="text-secondary">
                    Discount
                  </span>
                  <span>
                    - Rs.{" "}
                    {Number(
                      formData.discount || 0
                    ).toLocaleString()}
                  </span>
                </div>

                <div className="d-flex justify-content-between mb-2">
                  <span className="text-secondary">
                    Tax
                  </span>
                  <span>
                    + Rs.{" "}
                    {Number(
                      formData.tax || 0
                    ).toLocaleString()}
                  </span>
                </div>

                <hr />

                <div className="d-flex justify-content-between fw-bold fs-5">
                  <span>Total</span>
                  <span>
                    Rs. {total.toLocaleString()}
                  </span>
                </div>
              </div>
            </FormSection>
          </div>

          <div className="modal-footer px-4">
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
              Save Sale
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SaleDetailsModal({ sale, onClose }) {
  const subtotal = getItemsSubtotal(sale.items);
  const total = getSaleTotal(sale);

  return (
    <div
      className="modal d-block"
      tabIndex="-1"
      style={{
        background: "rgba(0,0,0,0.5)",
        zIndex: 1100,
      }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content border-0 rounded-4">
          <div className="modal-header px-4 py-3">
            <div>
              <h5 className="fw-bold mb-1">
                Invoice {sale.invoiceNumber}
              </h5>

              <small className="text-secondary">
                {formatDate(sale.saleDate)}
              </small>
            </div>

            <button
              type="button"
              className="btn-close"
              onClick={onClose}
            />
          </div>

          <div className="modal-body p-4">
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <div className="border rounded-3 p-3 h-100">
                  <h6 className="fw-bold">
                    Customer
                  </h6>

                  <DetailRow
                    label="Name"
                    value={sale.customerName}
                  />

                  <DetailRow
                    label="Phone"
                    value={sale.customerPhone || "—"}
                  />

                  <DetailRow
                    label="Patient"
                    value={sale.patientName || "—"}
                  />
                </div>
              </div>

              <div className="col-md-6">
                <div className="border rounded-3 p-3 h-100">
                  <h6 className="fw-bold">
                    Payment
                  </h6>

                  <DetailRow
                    label="Method"
                    value={sale.paymentMethod}
                  />

                  <DetailRow
                    label="Status"
                    value={sale.paymentStatus}
                  />

                  <DetailRow
                    label="Sale status"
                    value={sale.saleStatus}
                  />
                </div>
              </div>
            </div>

            <h6 className="fw-bold mb-3">
              Invoice Items
            </h6>

            <div className="table-responsive border rounded-3 mb-4">
              <table className="table align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-3">Item</th>
                    <th>Category</th>
                    <th>Qty.</th>
                    <th>Price</th>
                    <th className="text-end px-3">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sale.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 fw-semibold">
                        {item.name}
                      </td>
                      <td>{item.category}</td>
                      <td>{item.quantity}</td>
                      <td>
                        Rs.{" "}
                        {Number(item.price).toLocaleString()}
                      </td>
                      <td className="text-end px-3">
                        Rs.{" "}
                        {(
                          Number(item.quantity) *
                          Number(item.price)
                        ).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ms-auto" style={{ maxWidth: 380 }}>
              <DetailRow
                label="Subtotal"
                value={`Rs. ${subtotal.toLocaleString()}`}
              />

              <DetailRow
                label="Discount"
                value={`Rs. ${Number(
                  sale.discount || 0
                ).toLocaleString()}`}
              />

              <DetailRow
                label="Tax"
                value={`Rs. ${Number(
                  sale.tax || 0
                ).toLocaleString()}`}
              />

              <hr />

              <div className="d-flex justify-content-between fs-5 fw-bold">
                <span>Total</span>
                <span>
                  Rs. {total.toLocaleString()}
                </span>
              </div>
            </div>

            {sale.notes && (
              <div className="border rounded-3 bg-light p-3 mt-4">
                <div className="small text-secondary mb-1">
                  Notes
                </div>

                <div>{sale.notes}</div>
              </div>
            )}
          </div>

          <div className="modal-footer px-4">
            <button
              type="button"
              className="btn btn-primary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormSection({ title, children }) {
  return (
    <section className="mb-4">
      <h6 className="fw-bold mb-3">{title}</h6>
      {children}
    </section>
  );
}

function FormInput({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  ...rest
}) {
  return (
    <>
      {label && (
        <label className="form-label">
          {label}
          {required && (
            <span className="text-danger"> *</span>
          )}
        </label>
      )}

      <input
        type={type}
        className="form-control"
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        {...rest}
      />
    </>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="d-flex justify-content-between gap-3 py-2 border-bottom">
      <span className="text-secondary">{label}</span>
      <span className="fw-semibold text-end">
        {value}
      </span>
    </div>
  );
}

function PaymentStatusBadge({ status }) {
  const className =
    status === "Paid"
      ? "bg-success-subtle text-success"
      : status === "Pending"
        ? "bg-warning-subtle text-warning-emphasis"
        : status === "Refunded"
          ? "bg-danger-subtle text-danger"
          : "bg-info-subtle text-info-emphasis";

  return (
    <span className={`badge rounded-pill ${className}`}>
      {status}
    </span>
  );
}

function formatDate(date) {
  if (!date) return "—";

  return new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
}

export default Sales;