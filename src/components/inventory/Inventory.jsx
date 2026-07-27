import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Barcode,
  Boxes,
  CheckCircle2,
  Download,
  Edit3,
  FolderCog,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingDown,
  X,
} from "lucide-react";

import inventoryService from "../../services/inventory.service.js";

const ITEM_TYPES = [
  "MEDICINE",
  "VACCINE",
  "CONSUMABLE",
  "DIAGNOSTIC",
  "PET_FOOD",
  "PET_CARE",
  "SURGICAL_SUPPLY",
  "OTHER",
];

const UNITS = [
  "Piece",
  "Box",
  "Bottle",
  "Vial",
  "Strip",
  "Kit",
  "Pack",
  "Bag",
  "Tube",
  "Can",
  "Tablet",
  "Capsule",
  "Millilitre",
];

const emptyItemForm = () => ({
  name: "",
  genericName: "",
  type: "MEDICINE",
  categoryId: "",
  unit: "Piece",
  purchasePrice: "",
  sellingPrice: "",
  openingStock: "",
  reorderLevel: "",
  taxPercent: "",
  requiresBatch: false,
  isActive: true,
  sku: "",
  barcode: "",
});

const emptyCategoryForm = () => ({
  name: "",
  description: "",
});

const emptyStockForm = () => ({
  quantity: "",
  reason: "",
  batchId: "",
});

const emptyBatchForm = () => ({
  batchNumber: "",
  quantity: "",
  costPrice: "",
  manufactureDate: "",
  expiryDate: "",
  reason: "",
});

const money = (value) =>
  `NPR ${Number(value || 0).toLocaleString(
    "en-GB",
    {
      maximumFractionDigits: 2,
    },
  )}`;

const displayType = (value = "") =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );

const getStockStatus = (item) => {
  if (!item.isActive) {
    return "Inactive";
  }

  if (Number(item.currentStock) <= 0) {
    return "Out of Stock";
  }

  if (
    Number(item.currentStock) <=
    Number(item.reorderLevel)
  ) {
    return "Low Stock";
  }

  return "In Stock";
};

const getStatusClass = (status) => {
  const classes = {
    "In Stock": "text-bg-success",
    "Low Stock": "text-bg-warning",
    "Out of Stock": "text-bg-danger",
    Inactive: "text-bg-secondary",
  };

  return classes[status] || "text-bg-secondary";
};

const normaliseItemPayload = (
  form,
  isEditing,
) => {
  const payload = {
    name: form.name.trim(),
    genericName:
      form.genericName.trim() || null,
    type: form.type,
    categoryId: form.categoryId || null,
    unit: form.unit.trim(),
    purchasePrice: Number(
      form.purchasePrice || 0,
    ),
    sellingPrice: Number(
      form.sellingPrice || 0,
    ),
    reorderLevel: Number(
      form.reorderLevel || 0,
    ),
    taxPercent: Number(
      form.taxPercent || 0,
    ),
    requiresBatch: Boolean(
      form.requiresBatch,
    ),
    isActive: Boolean(form.isActive),

    // These two fields are optional.
    sku: form.sku.trim() || null,
    barcode: form.barcode.trim() || null,
  };

  if (!isEditing) {
    payload.currentStock =
      form.requiresBatch
        ? 0
        : Number(form.openingStock || 0);
  }

  return payload;
};

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] =
    useState([]);
  const [stats, setStats] = useState(null);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
    });

  const [filters, setFilters] = useState({
    search: "",
    categoryId: "",
    type: "",
    stockStatus: "",
    isActive: "true",
  });

  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] =
    useState("");

  const [itemModal, setItemModal] =
    useState(false);
  const [editingItem, setEditingItem] =
    useState(null);
  const [itemForm, setItemForm] =
    useState(emptyItemForm());

  const [
    categoryManagerOpen,
    setCategoryManagerOpen,
  ] = useState(false);

  const [
    editingCategory,
    setEditingCategory,
  ] = useState(null);

  const [categoryForm, setCategoryForm] =
    useState(emptyCategoryForm());

  const [stockModal, setStockModal] =
    useState(null);
  const [stockForm, setStockForm] =
    useState(emptyStockForm());

  const [batchModal, setBatchModal] =
    useState(null);
  const [batchForm, setBatchForm] =
    useState(emptyBatchForm());

  const [details, setDetails] =
    useState(null);
  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const loadCategories = useCallback(
    async () => {
      const result =
        await inventoryService.getCategories();

      setCategories(result.data || []);
    },
    [],
  );

  const loadStats = useCallback(async () => {
    const result =
      await inventoryService.getStats();

    setStats(result.data || null);
  }, []);

  const loadItems = useCallback(
    async (page = 1) => {
      const result =
        await inventoryService.getItems({
          page,
          limit: pagination.limit,
          search: filters.search.trim(),
          categoryId: filters.categoryId,
          type: filters.type,
          stockStatus: filters.stockStatus,
          isActive: filters.isActive,
          sortBy: "name",
          sortOrder: "asc",
        });

      setItems(result.data || []);
      setPagination((previous) => ({
        ...previous,
        ...(result.pagination || {}),
      }));
    },
    [
      filters,
      pagination.limit,
    ],
  );

  const reloadPage = useCallback(
    async (page = pagination.page) => {
      try {
        setLoading(true);
        setError("");

        await Promise.all([
          loadItems(page),
          loadCategories(),
          loadStats(),
        ]);
      } catch (requestError) {
        setError(
          requestError.message ||
            "Unable to load inventory.",
        );
      } finally {
        setLoading(false);
      }
    },
    [
      loadCategories,
      loadItems,
      loadStats,
      pagination.page,
    ],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      reloadPage(1);
    }, 300);

    return () =>
      window.clearTimeout(timer);
  }, [
    filters.search,
    filters.categoryId,
    filters.type,
    filters.stockStatus,
    filters.isActive,
  ]);

  const attentionItems = useMemo(
    () =>
      items
        .filter((item) =>
          [
            "Low Stock",
            "Out of Stock",
          ].includes(getStockStatus(item)),
        )
        .slice(0, 5),
    [items],
  );

  const openCreateItem = () => {
    setEditingItem(null);
    setItemForm(emptyItemForm());
    setError("");
    setItemModal(true);
  };

  const openEditItem = (item) => {
    setEditingItem(item);

    setItemForm({
      name: item.name || "",
      genericName: item.genericName || "",
      type: item.type || "MEDICINE",
      categoryId: item.categoryId || "",
      unit: item.unit || "Piece",
      purchasePrice:
        Number(item.purchasePrice) || "",
      sellingPrice:
        Number(item.sellingPrice) || "",
      openingStock: "",
      reorderLevel:
        Number(item.reorderLevel) || "",
      taxPercent:
        Number(item.taxPercent) || "",
      requiresBatch: Boolean(
        item.requiresBatch,
      ),
      isActive: Boolean(item.isActive),
      sku: item.sku || "",
      barcode: item.barcode || "",
    });

    setError("");
    setItemModal(true);
  };

  const submitItem = async (event) => {
    event.preventDefault();

    if (!itemForm.name.trim()) {
      setError("Item name is required.");
      return;
    }

    if (!itemForm.unit.trim()) {
      setError("Unit is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = normaliseItemPayload(
        itemForm,
        Boolean(editingItem),
      );

      if (editingItem) {
        await inventoryService.updateItem(
          editingItem.id,
          payload,
        );

        setSuccess(
          "Inventory item updated successfully.",
        );
      } else {
        const response =
          await inventoryService.createItem(
            payload,
          );

        const createdItem = response.data;

        // A batch-tracked item starts at zero.
        // Open the batch form immediately so
        // opening stock is recorded correctly.
        if (
          itemForm.requiresBatch &&
          Number(itemForm.openingStock) > 0
        ) {
          setBatchModal(createdItem);

          setBatchForm({
            ...emptyBatchForm(),
            quantity: itemForm.openingStock,
            costPrice:
              itemForm.purchasePrice || "",
            reason: "Opening batch stock",
          });
        }

        setSuccess(
          "Inventory item created successfully.",
        );
      }

      setItemModal(false);
      await reloadPage(1);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to save inventory item.",
      );
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (item) => {
    const confirmed = window.confirm(
      `Delete "${item.name}"? Items with available stock cannot be deleted.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await inventoryService.deleteItem(
        item.id,
      );

      setSuccess(
        "Inventory item deleted successfully.",
      );

      await reloadPage(1);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to delete inventory item.",
      );
    }
  };

  const openDetails = async (item) => {
    try {
      setDetailsLoading(true);
      setError("");
      setDetails({ ...item });

      const result =
        await inventoryService.getItem(item.id);

      setDetails(result.data);
    } catch (requestError) {
      setDetails(null);
      setError(
        requestError.message ||
          "Unable to load inventory details.",
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const openStockAdjustment = async (
    item,
    mode,
  ) => {
    try {
      setError("");

      const batchResult = item.requiresBatch
        ? await inventoryService.getBatches(
            item.id,
          )
        : { data: [] };

      setStockModal({
        item,
        mode,
        batches: batchResult.data || [],
      });

      setStockForm(emptyStockForm());
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to load batches.",
      );
    }
  };

  const submitStockAdjustment = async (
    event,
  ) => {
    event.preventDefault();

    const quantity = Number(
      stockForm.quantity,
    );

    if (!quantity || quantity <= 0) {
      setError(
        "Stock quantity must be greater than zero.",
      );
      return;
    }

    if (
      stockModal.item.requiresBatch &&
      !stockForm.batchId
    ) {
      setError(
        "Select a batch for this batch-tracked item.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await inventoryService.adjustStock(
        stockModal.item.id,
        {
          type:
            stockModal.mode === "add"
              ? "ADJUSTMENT_IN"
              : "ADJUSTMENT_OUT",
          quantity,
          batchId:
            stockForm.batchId || null,
          reason:
            stockForm.reason.trim() ||
            null,
          referenceType:
            "MANUAL_ADJUSTMENT",
        },
      );

      setStockModal(null);
      setSuccess(
        "Stock adjusted successfully.",
      );

      await reloadPage();
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to adjust stock.",
      );
    } finally {
      setSaving(false);
    }
  };

  const openBatchForm = (item) => {
    setBatchModal(item);
    setBatchForm({
      ...emptyBatchForm(),
      costPrice:
        Number(item.purchasePrice) || "",
    });
    setError("");
  };

  const submitBatch = async (event) => {
    event.preventDefault();

    if (!batchForm.batchNumber.trim()) {
      setError(
        "Batch number is required.",
      );
      return;
    }

    if (
      Number(batchForm.quantity) <= 0
    ) {
      setError(
        "Batch quantity must be greater than zero.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await inventoryService.createBatch(
        batchModal.id,
        {
          batchNumber:
            batchForm.batchNumber.trim(),
          quantity: Number(
            batchForm.quantity,
          ),
          costPrice: Number(
            batchForm.costPrice || 0,
          ),
          manufactureDate:
            batchForm.manufactureDate ||
            null,
          expiryDate:
            batchForm.expiryDate || null,
          reason:
            batchForm.reason.trim() ||
            "Stock batch received",
        },
      );

      setBatchModal(null);
      setSuccess(
        "Inventory batch created and stock added successfully.",
      );

      await reloadPage();
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to create inventory batch.",
      );
    } finally {
      setSaving(false);
    }
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCategoryForm(emptyCategoryForm());
  };

  const editCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name || "",
      description:
        category.description || "",
    });
  };

  const submitCategory = async (event) => {
    event.preventDefault();

    if (!categoryForm.name.trim()) {
      setError(
        "Category name is required.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        name: categoryForm.name.trim(),
        description:
          categoryForm.description.trim() ||
          null,
      };

      if (editingCategory) {
        await inventoryService.updateCategory(
          editingCategory.id,
          payload,
        );

        setSuccess(
          "Category updated successfully.",
        );
      } else {
        await inventoryService.createCategory(
          payload,
        );

        setSuccess(
          "Category created successfully.",
        );
      }

      resetCategoryForm();
      await loadCategories();
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to save category.",
      );
    } finally {
      setSaving(false);
    }
  };

  const removeCategory = async (
    category,
  ) => {
    const confirmed = window.confirm(
      `Delete category "${category.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await inventoryService.deleteCategory(
        category.id,
      );

      setSuccess(
        "Category deleted successfully.",
      );

      if (
        filters.categoryId === category.id
      ) {
        setFilters((previous) => ({
          ...previous,
          categoryId: "",
        }));
      }

      await loadCategories();
    } catch (requestError) {
      setError(
        requestError.message ||
          "Unable to delete category.",
      );
    }
  };

  return (
    <div className="inventory-page container-fluid py-4">
      <section className="inventory-hero rounded-4 p-4 p-xl-5 mb-4">
        <div className="row align-items-center g-4">
          <div className="col-xl-7">
            <span className="badge rounded-pill bg-primary-subtle text-primary mb-3 px-3 py-2">
              <Boxes size={15} className="me-2" />
              Clinic inventory workspace
            </span>

            <h2 className="fw-bold mb-2">
              Inventory management
            </h2>

            <p className="text-secondary mb-4">
              Manage medicines, vaccines,
              consumables, categories, batches,
              stock movement, pricing and reorder
              levels from one page.
            </p>

            <div className="d-flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary d-flex align-items-center gap-2"
                onClick={openCreateItem}
              >
                <Plus size={18} />
                Add inventory item
              </button>

              <button
                type="button"
                className="btn btn-light border d-flex align-items-center gap-2"
                onClick={() => {
                  resetCategoryForm();
                  setCategoryManagerOpen(true);
                }}
              >
                <FolderCog size={18} />
                Manage categories
              </button>

              <button
                type="button"
                className="btn btn-light border d-flex align-items-center gap-2"
                onClick={() =>
                  inventoryService
                    .exportCsv()
                    .catch((requestError) =>
                      setError(
                        requestError.message,
                      ),
                    )
                }
              >
                <Download size={18} />
                Export CSV
              </button>
            </div>
          </div>

          <div className="col-xl-5">
            <div className="row g-3">
              <SummaryCard
                label="Total items"
                value={stats?.totalItems ?? 0}
                icon={Package}
              />

              <SummaryCard
                label="Low stock"
                value={stats?.lowStockItems ?? 0}
                icon={TrendingDown}
              />

              <SummaryCard
                label="Out of stock"
                value={
                  stats?.outOfStockItems ?? 0
                }
                icon={AlertTriangle}
              />

              <SummaryCard
                label="Cost value"
                value={money(
                  stats?.stockValue?.cost,
                )}
                icon={CheckCircle2}
              />
            </div>
          </div>
        </div>
      </section>

      {error && (
        <Message
          type="danger"
          text={error}
          onClose={() => setError("")}
        />
      )}

      {success && (
        <Message
          type="success"
          text={success}
          onClose={() => setSuccess("")}
        />
      )}

      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-4">
          <div className="row g-3">
            <div className="col-xl-4">
              <label className="form-label small fw-semibold">
                Search inventory
              </label>

              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <Search size={17} />
                </span>

                <input
                  type="search"
                  className="form-control border-start-0"
                  placeholder="Name, generic name, SKU or barcode"
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((previous) => ({
                      ...previous,
                      search:
                        event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <FilterSelect
              label="Category"
              value={filters.categoryId}
              onChange={(value) =>
                setFilters((previous) => ({
                  ...previous,
                  categoryId: value,
                }))
              }
            >
              <option value="">
                All categories
              </option>

              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              label="Item type"
              value={filters.type}
              onChange={(value) =>
                setFilters((previous) => ({
                  ...previous,
                  type: value,
                }))
              }
            >
              <option value="">
                All types
              </option>

              {ITEM_TYPES.map((type) => (
                <option
                  key={type}
                  value={type}
                >
                  {displayType(type)}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              label="Stock status"
              value={filters.stockStatus}
              onChange={(value) =>
                setFilters((previous) => ({
                  ...previous,
                  stockStatus: value,
                }))
              }
            >
              <option value="">
                All stock levels
              </option>
              <option value="low-stock">
                Low stock
              </option>
              <option value="out-of-stock">
                Out of stock
              </option>
            </FilterSelect>

            <FilterSelect
              label="Activity"
              value={filters.isActive}
              onChange={(value) =>
                setFilters((previous) => ({
                  ...previous,
                  isActive: value,
                }))
              }
            >
              <option value="">
                All items
              </option>
              <option value="true">
                Active
              </option>
              <option value="false">
                Inactive
              </option>
            </FilterSelect>
          </div>

          <div className="d-flex justify-content-end mt-3">
            <button
              type="button"
              className="btn btn-sm btn-link text-decoration-none"
              onClick={() =>
                setFilters({
                  search: "",
                  categoryId: "",
                  type: "",
                  stockStatus: "",
                  isActive: "true",
                })
              }
            >
              Reset filters
            </button>
          </div>
        </div>
      </div>

      {attentionItems.length > 0 && (
        <div className="alert alert-warning border-0 shadow-sm rounded-4">
          <div className="d-flex gap-3">
            <AlertTriangle
              size={22}
              className="flex-shrink-0"
            />

            <div>
              <div className="fw-semibold">
                Stock attention required
              </div>

              <small>
                {attentionItems
                  .map((item) => item.name)
                  .join(", ")}
              </small>
            </div>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-header bg-white border-0 p-4 d-flex flex-column flex-md-row justify-content-between gap-3">
          <div>
            <h5 className="fw-bold mb-1">
              Inventory records
            </h5>

            <small className="text-secondary">
              {pagination.total} item
              {pagination.total === 1
                ? ""
                : "s"}{" "}
              found
            </small>
          </div>

          <button
            type="button"
            className="btn btn-light border d-flex align-items-center gap-2 align-self-start"
            onClick={() =>
              reloadPage(pagination.page)
            }
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0 inventory-table">
            <thead className="table-light">
              <tr>
                <th className="ps-4">Item</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Pricing</th>
                <th>Identifiers</th>
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
                    colSpan="7"
                    className="text-center py-5"
                  >
                    <div className="spinner-border text-primary" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="text-center py-5"
                  >
                    <Package
                      size={42}
                      className="text-secondary mb-3"
                    />

                    <h6 className="fw-bold">
                      No inventory items found
                    </h6>

                    <p className="text-secondary mb-3">
                      Add your first inventory
                      item or change the filters.
                    </p>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={openCreateItem}
                    >
                      Add inventory item
                    </button>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const status =
                    getStockStatus(item);

                  return (
                    <tr key={item.id}>
                      <td className="ps-4">
                        <button
                          type="button"
                          className="btn btn-link text-start text-decoration-none p-0"
                          onClick={() =>
                            openDetails(item)
                          }
                        >
                          <div className="fw-semibold text-dark">
                            {item.name}
                          </div>

                          <small className="text-secondary">
                            {item.genericName ||
                              displayType(
                                item.type,
                              )}
                          </small>
                        </button>
                      </td>

                      <td>
                        <div>
                          {item.category
                            ?.name ||
                            "Uncategorised"}
                        </div>

                        <small className="text-secondary">
                          {displayType(
                            item.type,
                          )}
                        </small>
                      </td>

                      <td>
                        <div className="fw-semibold">
                          {Number(
                            item.currentStock,
                          )}{" "}
                          {item.unit}
                        </div>

                        <small className="text-secondary">
                          Reorder level:{" "}
                          {Number(
                            item.reorderLevel,
                          )}
                        </small>
                      </td>

                      <td>
                        <div>
                          {money(
                            item.sellingPrice,
                          )}
                        </div>

                        <small className="text-secondary">
                          Cost:{" "}
                          {money(
                            item.purchasePrice,
                          )}
                        </small>
                      </td>

                      <td>
                        <div className="small">
                          SKU:{" "}
                          <span className="text-secondary">
                            {item.sku ||
                              "Optional / not set"}
                          </span>
                        </div>

                        <div className="small">
                          Barcode:{" "}
                          <span className="text-secondary">
                            {item.barcode ||
                              "Optional / not set"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`badge ${getStatusClass(
                            status,
                          )}`}
                        >
                          {status}
                        </span>

                        {item.requiresBatch && (
                          <div className="small text-primary mt-1">
                            Batch tracked
                          </div>
                        )}
                      </td>

                      <td className="text-end pe-4">
                        <div className="dropdown">
                          <button
                            type="button"
                            className="btn btn-sm btn-light border dropdown-toggle"
                            data-bs-toggle="dropdown"
                          >
                            Actions
                          </button>

                          <ul className="dropdown-menu dropdown-menu-end shadow-sm">
                            <li>
                              <button
                                className="dropdown-item"
                                onClick={() =>
                                  openDetails(
                                    item,
                                  )
                                }
                              >
                                View details
                              </button>
                            </li>

                            <li>
                              <button
                                className="dropdown-item"
                                onClick={() =>
                                  openEditItem(
                                    item,
                                  )
                                }
                              >
                                Edit item
                              </button>
                            </li>

                            {item.requiresBatch && (
                              <li>
                                <button
                                  className="dropdown-item"
                                  onClick={() =>
                                    openBatchForm(
                                      item,
                                    )
                                  }
                                >
                                  Add new batch
                                </button>
                              </li>
                            )}

                            <li>
                              <button
                                className="dropdown-item"
                                onClick={() =>
                                  openStockAdjustment(
                                    item,
                                    "add",
                                  )
                                }
                              >
                                Add stock
                              </button>
                            </li>

                            <li>
                              <button
                                className="dropdown-item"
                                onClick={() =>
                                  openStockAdjustment(
                                    item,
                                    "remove",
                                  )
                                }
                              >
                                Remove stock
                              </button>
                            </li>

                            <li>
                              <hr className="dropdown-divider" />
                            </li>

                            <li>
                              <button
                                className="dropdown-item text-danger"
                                onClick={() =>
                                  removeItem(item)
                                }
                              >
                                Delete item
                              </button>
                            </li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  );
                })
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
                loading ||
                pagination.page <= 1
              }
              onClick={() =>
                reloadPage(
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
                loading ||
                pagination.page >=
                  pagination.totalPages
              }
              onClick={() =>
                reloadPage(
                  pagination.page + 1,
                )
              }
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {itemModal && (
        <Modal
          title={
            editingItem
              ? "Edit inventory item"
              : "Add inventory item"
          }
          onClose={() =>
            setItemModal(false)
          }
          size="modal-xl"
        >
          <form onSubmit={submitItem}>
            <SectionTitle title="Basic information" />

            <div className="row g-3">
              <InputField
                label="Item name"
                value={itemForm.name}
                onChange={(value) =>
                  setItemForm(
                    (previous) => ({
                      ...previous,
                      name: value,
                    }),
                  )
                }
                required
              />

              <InputField
                label="Generic name"
                value={itemForm.genericName}
                onChange={(value) =>
                  setItemForm(
                    (previous) => ({
                      ...previous,
                      genericName: value,
                    }),
                  )
                }
              />

              <SelectField
                label="Item type"
                value={itemForm.type}
                onChange={(value) =>
                  setItemForm(
                    (previous) => ({
                      ...previous,
                      type: value,
                    }),
                  )
                }
              >
                {ITEM_TYPES.map((type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {displayType(type)}
                  </option>
                ))}
              </SelectField>

              <div className="col-md-6">
                <div className="d-flex justify-content-between align-items-center">
                  <label className="form-label">
                    Category
                  </label>

                  <button
                    type="button"
                    className="btn btn-sm btn-link text-decoration-none p-0"
                    onClick={() => {
                      resetCategoryForm();
                      setCategoryManagerOpen(
                        true,
                      );
                    }}
                  >
                    Manage
                  </button>
                </div>

                <select
                  className="form-select"
                  value={
                    itemForm.categoryId
                  }
                  onChange={(event) =>
                    setItemForm(
                      (previous) => ({
                        ...previous,
                        categoryId:
                          event.target
                            .value,
                      }),
                    )
                  }
                >
                  <option value="">
                    No category
                  </option>

                  {categories.map(
                    (category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <SelectField
                label="Unit"
                value={itemForm.unit}
                onChange={(value) =>
                  setItemForm(
                    (previous) => ({
                      ...previous,
                      unit: value,
                    }),
                  )
                }
              >
                {UNITS.map((unit) => (
                  <option
                    key={unit}
                    value={unit}
                  >
                    {unit}
                  </option>
                ))}
              </SelectField>
            </div>

            <SectionTitle
              title="Stock and pricing"
              className="mt-4"
            />

            <div className="row g-3">
              {!editingItem && (
                <InputField
                  label={
                    itemForm.requiresBatch
                      ? "Opening stock for first batch"
                      : "Opening stock"
                  }
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    itemForm.openingStock
                  }
                  onChange={(value) =>
                    setItemForm(
                      (previous) => ({
                        ...previous,
                        openingStock:
                          value,
                      }),
                    )
                  }
                  help={
                    itemForm.requiresBatch
                      ? "After creating the item, you will be asked for its first batch number."
                      : ""
                  }
                />
              )}

              <InputField
                label="Reorder level"
                type="number"
                min="0"
                step="0.01"
                value={
                  itemForm.reorderLevel
                }
                onChange={(value) =>
                  setItemForm(
                    (previous) => ({
                      ...previous,
                      reorderLevel:
                        value,
                    }),
                  )
                }
              />

              <InputField
                label="Purchase price"
                type="number"
                min="0"
                step="0.01"
                value={
                  itemForm.purchasePrice
                }
                onChange={(value) =>
                  setItemForm(
                    (previous) => ({
                      ...previous,
                      purchasePrice:
                        value,
                    }),
                  )
                }
              />

              <InputField
                label="Selling price"
                type="number"
                min="0"
                step="0.01"
                value={
                  itemForm.sellingPrice
                }
                onChange={(value) =>
                  setItemForm(
                    (previous) => ({
                      ...previous,
                      sellingPrice:
                        value,
                    }),
                  )
                }
              />

              <InputField
                label="Tax percent"
                type="number"
                min="0"
                step="0.01"
                value={itemForm.taxPercent}
                onChange={(value) =>
                  setItemForm(
                    (previous) => ({
                      ...previous,
                      taxPercent: value,
                    }),
                  )
                }
              />
            </div>

            <SectionTitle
              title="Optional identifiers"
              className="mt-4"
            />

            <div className="alert alert-light border small">
              SKU and barcode are optional.
              Leave either field empty when your
              clinic does not use it.
            </div>

            <div className="row g-3">
              <InputField
                label="SKU (optional)"
                value={itemForm.sku}
                onChange={(value) =>
                  setItemForm(
                    (previous) => ({
                      ...previous,
                      sku: value,
                    }),
                  )
                }
                icon={Package}
              />

              <InputField
                label="Barcode (optional)"
                value={itemForm.barcode}
                onChange={(value) =>
                  setItemForm(
                    (previous) => ({
                      ...previous,
                      barcode: value,
                    }),
                  )
                }
                icon={Barcode}
              />
            </div>

            <div className="d-flex flex-wrap gap-4 mt-4">
              <CheckField
                label="Requires batch tracking"
                checked={
                  itemForm.requiresBatch
                }
                onChange={(checked) =>
                  setItemForm(
                    (previous) => ({
                      ...previous,
                      requiresBatch:
                        checked,
                    }),
                  )
                }
              />

              <CheckField
                label="Active item"
                checked={itemForm.isActive}
                onChange={(checked) =>
                  setItemForm(
                    (previous) => ({
                      ...previous,
                      isActive: checked,
                    }),
                  )
                }
              />
            </div>

            <ModalActions
              saving={saving}
              submitLabel={
                editingItem
                  ? "Save changes"
                  : "Create item"
              }
              onCancel={() =>
                setItemModal(false)
              }
            />
          </form>
        </Modal>
      )}

      {categoryManagerOpen && (
        <Modal
          title="Inventory categories"
          onClose={() => {
            setCategoryManagerOpen(false);
            resetCategoryForm();
          }}
          size="modal-lg"
        >
          <form
            onSubmit={submitCategory}
            className="card bg-light border-0 mb-4"
          >
            <div className="card-body">
              <h6 className="fw-bold">
                {editingCategory
                  ? "Edit category"
                  : "Create category"}
              </h6>

              <div className="row g-3">
                <InputField
                  label="Category name"
                  value={
                    categoryForm.name
                  }
                  onChange={(value) =>
                    setCategoryForm(
                      (previous) => ({
                        ...previous,
                        name: value,
                      }),
                    )
                  }
                  required
                />

                <div className="col-12">
                  <label className="form-label">
                    Description
                  </label>

                  <textarea
                    className="form-control"
                    rows="2"
                    value={
                      categoryForm.description
                    }
                    onChange={(event) =>
                      setCategoryForm(
                        (previous) => ({
                          ...previous,
                          description:
                            event.target
                              .value,
                        }),
                      )
                    }
                  />
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-3">
                {editingCategory && (
                  <button
                    type="button"
                    className="btn btn-light border"
                    onClick={
                      resetCategoryForm
                    }
                  >
                    Cancel edit
                  </button>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingCategory
                      ? "Update category"
                      : "Add category"}
                </button>
              </div>
            </div>
          </form>

          <div className="list-group">
            {categories.length === 0 ? (
              <div className="text-center text-secondary py-4">
                No categories created yet.
              </div>
            ) : (
              categories.map((category) => (
                <div
                  key={category.id}
                  className="list-group-item d-flex justify-content-between align-items-center gap-3 py-3"
                >
                  <div>
                    <div className="fw-semibold">
                      {category.name}
                    </div>

                    <small className="text-secondary">
                      {category.description ||
                        "No description"}{" "}
                      ·{" "}
                      {category._count
                        ?.items || 0}{" "}
                      item(s)
                    </small>
                  </div>

                  <div className="btn-group">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() =>
                        editCategory(
                          category,
                        )
                      }
                    >
                      <Edit3 size={15} />
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      disabled={
                        Number(
                          category._count
                            ?.items || 0,
                        ) > 0
                      }
                      title={
                        Number(
                          category._count
                            ?.items || 0,
                        ) > 0
                          ? "Move items out of this category before deleting it"
                          : "Delete category"
                      }
                      onClick={() =>
                        removeCategory(
                          category,
                        )
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}

      {stockModal && (
        <Modal
          title={`${
            stockModal.mode === "add"
              ? "Add"
              : "Remove"
          } stock — ${stockModal.item.name}`}
          onClose={() =>
            setStockModal(null)
          }
          size="modal-lg"
        >
          <form
            onSubmit={
              submitStockAdjustment
            }
          >
            <div className="alert alert-light border">
              Current stock:{" "}
              <strong>
                {Number(
                  stockModal.item
                    .currentStock,
                )}{" "}
                {stockModal.item.unit}
              </strong>
            </div>

            <div className="row g-3">
              <InputField
                label="Quantity"
                type="number"
                min="0.01"
                step="0.01"
                value={
                  stockForm.quantity
                }
                onChange={(value) =>
                  setStockForm(
                    (previous) => ({
                      ...previous,
                      quantity: value,
                    }),
                  )
                }
                required
              />

              {stockModal.item
                .requiresBatch && (
                <div className="col-md-6">
                  <label className="form-label">
                    Batch
                  </label>

                  <select
                    className="form-select"
                    value={
                      stockForm.batchId
                    }
                    onChange={(event) =>
                      setStockForm(
                        (previous) => ({
                          ...previous,
                          batchId:
                            event.target
                              .value,
                        }),
                      )
                    }
                    required
                  >
                    <option value="">
                      Select batch
                    </option>

                    {stockModal.batches.map(
                      (batch) => (
                        <option
                          key={batch.id}
                          value={batch.id}
                        >
                          {
                            batch.batchNumber
                          }{" "}
                          —{" "}
                          {Number(
                            batch.quantityAvailable,
                          )}{" "}
                          available
                        </option>
                      ),
                    )}
                  </select>

                  {stockModal.batches
                    .length === 0 && (
                    <div className="mt-2">
                      <small className="text-danger d-block mb-2">
                        No batch is available.
                      </small>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => {
                          setStockModal(
                            null,
                          );
                          openBatchForm(
                            stockModal.item,
                          );
                        }}
                      >
                        Create a batch
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="col-12">
                <label className="form-label">
                  Reason
                </label>

                <textarea
                  className="form-control"
                  rows="3"
                  value={stockForm.reason}
                  onChange={(event) =>
                    setStockForm(
                      (previous) => ({
                        ...previous,
                        reason:
                          event.target
                            .value,
                      }),
                    )
                  }
                  placeholder="Optional note for the stock movement"
                />
              </div>
            </div>

            <ModalActions
              saving={saving}
              submitLabel="Confirm adjustment"
              onCancel={() =>
                setStockModal(null)
              }
            />
          </form>
        </Modal>
      )}

      {batchModal && (
        <Modal
          title={`Add batch — ${batchModal.name}`}
          onClose={() =>
            setBatchModal(null)
          }
          size="modal-lg"
        >
          <form onSubmit={submitBatch}>
            <div className="row g-3">
              <InputField
                label="Batch number"
                value={
                  batchForm.batchNumber
                }
                onChange={(value) =>
                  setBatchForm(
                    (previous) => ({
                      ...previous,
                      batchNumber: value,
                    }),
                  )
                }
                required
              />

              <InputField
                label="Quantity received"
                type="number"
                min="0.01"
                step="0.01"
                value={batchForm.quantity}
                onChange={(value) =>
                  setBatchForm(
                    (previous) => ({
                      ...previous,
                      quantity: value,
                    }),
                  )
                }
                required
              />

              <InputField
                label="Cost price"
                type="number"
                min="0"
                step="0.01"
                value={
                  batchForm.costPrice
                }
                onChange={(value) =>
                  setBatchForm(
                    (previous) => ({
                      ...previous,
                      costPrice: value,
                    }),
                  )
                }
              />

              <InputField
                label="Manufacture date"
                type="date"
                value={
                  batchForm.manufactureDate
                }
                onChange={(value) =>
                  setBatchForm(
                    (previous) => ({
                      ...previous,
                      manufactureDate:
                        value,
                    }),
                  )
                }
              />

              <InputField
                label="Expiry date"
                type="date"
                value={
                  batchForm.expiryDate
                }
                onChange={(value) =>
                  setBatchForm(
                    (previous) => ({
                      ...previous,
                      expiryDate: value,
                    }),
                  )
                }
              />

              <div className="col-12">
                <label className="form-label">
                  Reason
                </label>

                <textarea
                  className="form-control"
                  rows="2"
                  value={batchForm.reason}
                  onChange={(event) =>
                    setBatchForm(
                      (previous) => ({
                        ...previous,
                        reason:
                          event.target
                            .value,
                      }),
                    )
                  }
                />
              </div>
            </div>

            <ModalActions
              saving={saving}
              submitLabel="Create batch and add stock"
              onCancel={() =>
                setBatchModal(null)
              }
            />
          </form>
        </Modal>
      )}

      {details && (
        <Modal
          title="Inventory item details"
          onClose={() => setDetails(null)}
          size="modal-xl"
        >
          {detailsLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" />
            </div>
          ) : (
            <>
              <div className="d-flex flex-column flex-md-row justify-content-between gap-3 mb-4">
                <div>
                  <h4 className="fw-bold mb-1">
                    {details.name}
                  </h4>

                  <div className="text-secondary">
                    {details.genericName ||
                      displayType(
                        details.type,
                      )}
                  </div>
                </div>

                <div className="d-flex gap-2">
                  {details.requiresBatch && (
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={() => {
                        setDetails(null);
                        openBatchForm(
                          details,
                        );
                      }}
                    >
                      Add batch
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setDetails(null);
                      openEditItem(details);
                    }}
                  >
                    Edit item
                  </button>
                </div>
              </div>

              <div className="row g-3 mb-4">
                <DetailCard
                  label="Current stock"
                  value={`${Number(
                    details.currentStock,
                  )} ${details.unit}`}
                />

                <DetailCard
                  label="Reorder level"
                  value={Number(
                    details.reorderLevel,
                  )}
                />

                <DetailCard
                  label="Purchase price"
                  value={money(
                    details.purchasePrice,
                  )}
                />

                <DetailCard
                  label="Selling price"
                  value={money(
                    details.sellingPrice,
                  )}
                />
              </div>

              <div className="row g-4">
                <div className="col-lg-5">
                  <h6 className="fw-bold">
                    Item information
                  </h6>

                  <dl className="row small">
                    <dt className="col-5">
                      Category
                    </dt>
                    <dd className="col-7">
                      {details.category
                        ?.name ||
                        "Uncategorised"}
                    </dd>

                    <dt className="col-5">
                      Type
                    </dt>
                    <dd className="col-7">
                      {displayType(
                        details.type,
                      )}
                    </dd>

                    <dt className="col-5">
                      SKU
                    </dt>
                    <dd className="col-7">
                      {details.sku ||
                        "Not set"}
                    </dd>

                    <dt className="col-5">
                      Barcode
                    </dt>
                    <dd className="col-7">
                      {details.barcode ||
                        "Not set"}
                    </dd>

                    <dt className="col-5">
                      Batch tracking
                    </dt>
                    <dd className="col-7">
                      {details.requiresBatch
                        ? "Required"
                        : "Not required"}
                    </dd>

                    <dt className="col-5">
                      Activity
                    </dt>
                    <dd className="col-7">
                      {details.isActive
                        ? "Active"
                        : "Inactive"}
                    </dd>
                  </dl>
                </div>

                <div className="col-lg-7">
                  <h6 className="fw-bold">
                    Batches
                  </h6>

                  {details.batches?.length ? (
                    <div className="table-responsive">
                      <table className="table table-sm align-middle">
                        <thead>
                          <tr>
                            <th>Batch</th>
                            <th>Available</th>
                            <th>Expiry</th>
                            <th>Cost</th>
                          </tr>
                        </thead>

                        <tbody>
                          {details.batches.map(
                            (batch) => (
                              <tr
                                key={batch.id}
                              >
                                <td>
                                  {
                                    batch.batchNumber
                                  }
                                </td>
                                <td>
                                  {Number(
                                    batch.quantityAvailable,
                                  )}
                                </td>
                                <td>
                                  {batch.expiryDate
                                    ? new Date(
                                        batch.expiryDate,
                                      ).toLocaleDateString(
                                        "en-GB",
                                      )
                                    : "Not set"}
                                </td>
                                <td>
                                  {money(
                                    batch.costPrice,
                                  )}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-secondary small">
                      No batches available.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </Modal>
      )}

      <style>{`
        .inventory-page {
          min-height: 100%;
        }

        .inventory-hero {
          background:
            linear-gradient(
              135deg,
              rgba(var(--bs-primary-rgb), 0.12),
              rgba(var(--bs-primary-rgb), 0.025)
            ),
            #fff;
          border: 1px solid
            rgba(var(--bs-primary-rgb), 0.12);
        }

        .inventory-table th {
          white-space: nowrap;
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.035rem;
          color: var(--bs-secondary-color);
        }

        .inventory-table td {
          padding-top: 1rem;
          padding-bottom: 1rem;
        }

        .summary-card {
          min-height: 118px;
        }

        .summary-card-icon {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}) {
  return (
    <div className="col-sm-6">
      <div className="summary-card card border-0 shadow-sm rounded-4 h-100">
        <div className="card-body p-3 d-flex justify-content-between align-items-start gap-3">
          <div>
            <small className="text-secondary">
              {label}
            </small>

            <h5 className="fw-bold mb-0 mt-2">
              {value}
            </h5>
          </div>

          <div className="summary-card-icon rounded-3 bg-primary-subtle text-primary">
            <Icon size={20} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Message({
  type,
  text,
  onClose,
}) {
  return (
    <div
      className={`alert alert-${type} d-flex justify-content-between align-items-center border-0 shadow-sm`}
    >
      <span>{text}</span>

      <button
        type="button"
        className="btn-close"
        onClick={onClose}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}) {
  return (
    <div className="col-md-6 col-xl-2">
      <label className="form-label small fw-semibold">
        {label}
      </label>

      <select
        className="form-select"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
      >
        {children}
      </select>
    </div>
  );
}

function SectionTitle({
  title,
  className = "",
}) {
  return (
    <h6
      className={`fw-bold border-bottom pb-2 mb-3 ${className}`}
    >
      {title}
    </h6>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  min,
  step,
  required = false,
  help = "",
}) {
  return (
    <div className="col-md-6">
      <label className="form-label">
        {label}
      </label>

      <input
        type={type}
        className="form-control"
        value={value}
        min={min}
        step={step}
        required={required}
        onChange={(event) =>
          onChange(event.target.value)
        }
      />

      {help && (
        <small className="text-secondary">
          {help}
        </small>
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}) {
  return (
    <div className="col-md-6">
      <label className="form-label">
        {label}
      </label>

      <select
        className="form-select"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
      >
        {children}
      </select>
    </div>
  );
}

function CheckField({
  label,
  checked,
  onChange,
}) {
  return (
    <label className="form-check">
      <input
        type="checkbox"
        className="form-check-input"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
      />

      <span className="form-check-label">
        {label}
      </span>
    </label>
  );
}

function ModalActions({
  saving,
  submitLabel,
  onCancel,
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
        className="btn btn-primary"
        disabled={saving}
      >
        {saving
          ? "Saving..."
          : submitLabel}
      </button>
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

        <div className="fw-bold mt-1">
          {value}
        </div>
      </div>
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
        role="dialog"
      >
        <div
          className={`modal-dialog ${size} modal-dialog-centered modal-dialog-scrollable`}
        >
          <div className="modal-content border-0 shadow">
            <div className="modal-header">
              <h5 className="modal-title fw-bold">
                {title}
              </h5>

              <button
                type="button"
                className="btn btn-light border-0"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={18} />
              </button>
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
