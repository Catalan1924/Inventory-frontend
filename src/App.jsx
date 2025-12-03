import { useEffect, useState } from "react";
import "./App.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";


function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [theme, setTheme] = useState("dark");

  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [username, setUsername] = useState(localStorage.getItem("username") || "");
  const [role, setRole] = useState(localStorage.getItem("role") || "User");
  const isAuthenticated = !!token;


  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);


  const [searchTerm, setSearchTerm] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);

  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    stock: "",
    reorder_level: "",
    supplier_id: "",
  });

  const [newSupplier, setNewSupplier] = useState({
    name: "",
    contact: "",
    email: "",
  });

  const [newOrder, setNewOrder] = useState({
    order_number: "",
    product_id: "",
    quantity: "",
    status: "pending",
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("username", username);
      localStorage.setItem("role", role);
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      localStorage.removeItem("role");
    }
  }, [token, username, role]);

  const authFetch = (url, options = {}) => {
    const headers = options.headers ? { ...options.headers } : {};
    if (token) headers["Authorization"] = `Token ${token}`;
    return fetch(url, { ...options, headers });
  };


  useEffect(() => {
    if (!token) {
      setProducts([]);
      setSuppliers([]);
      setOrders([]);
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      setError("");
      try {
        const [pRes, sRes, oRes] = await Promise.all([
          authFetch(`${API_BASE}/products/`),
          authFetch(`${API_BASE}/suppliers/`),
          authFetch(`${API_BASE}/orders/`),
        ]);

        if (pRes.status === 401 || sRes.status === 401 || oRes.status === 401) {
          handleLogout();
          return;
        }

        if (!pRes.ok || !sRes.ok || !oRes.ok) {
          throw new Error("Failed to load data");
        }

        const [pData, sData, oData] = await Promise.all([
          pRes.json(),
          sRes.json(),
          oRes.json(),
        ]);

        setProducts(pData);
        setSuppliers(sData);
        setOrders(oData);
      } catch (err) {
        console.error(err);
        setError("Failed to load data. Check that the backend server is running.");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [token]);


  const totalProducts = products.length;
  const totalSuppliers = suppliers.length;
  const lowStockCount = products.filter((p) => p.stock <= p.reorder_level).length;
  const totalStockQty = products.reduce((sum, p) => sum + (p.stock || 0), 0);

  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const completedOrders = orders.filter((o) => o.status === "completed").length;
  const cancelledOrders = orders.filter((o) => o.status === "cancelled").length;


  const handleAddProduct = async (e) => {
    e.preventDefault();
    setError("");

    if (!newProduct.name || !newProduct.sku) {
      alert("Product name and SKU are required");
      return;
    }

    try {
      const res = await authFetch(`${API_BASE}/products/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProduct.name,
          sku: newProduct.sku,
          stock: Number(newProduct.stock) || 0,
          reorder_level: Number(newProduct.reorder_level) || 0,
          supplier_id: newProduct.supplier_id || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to create product");
      const data = await res.json();
      setProducts((prev) => [...prev, data]);

      setNewProduct({
        name: "",
        sku: "",
        stock: "",
        reorder_level: "",
        supplier_id: "",
      });
    } catch (err) {
      console.error(err);
      setError("Could not create product.");
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    setError("");

    try {
      const res = await authFetch(`${API_BASE}/products/${id}/`, {
        method: "DELETE",
      });

      if (!res.ok && res.status !== 204) {
        throw new Error("Failed to delete product");
      }

      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
      setError("Could not delete product.");
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    setError("");

    try {
      const payload = {
        name: editingProduct.name,
        sku: editingProduct.sku,
        stock: Number(editingProduct.stock) || 0,
        reorder_level: Number(editingProduct.reorder_level) || 0,
        supplier_id:
          editingProduct.supplier_id ??
          (editingProduct.supplier ? editingProduct.supplier.id : null),
      };

      const res = await authFetch(`${API_BASE}/products/${editingProduct.id}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update product");
      const updated = await res.json();
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditingProduct(null);
    } catch (err) {
      console.error(err);
      setError("Could not update product.");
    }
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    setError("");

    if (!newSupplier.name) {
      alert("Supplier name is required");
      return;
    }

    try {
      const res = await authFetch(`${API_BASE}/suppliers/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSupplier),
      });

      if (!res.ok) throw new Error("Failed to create supplier");
      const data = await res.json();
      setSuppliers((prev) => [...prev, data]);
      setNewSupplier({ name: "", contact: "", email: "" });
    } catch (err) {
      console.error(err);
      setError("Could not create supplier.");
    }
  };

  // order handlers
  const handleAddOrder = async (e) => {
    e.preventDefault();
    setError("");

    if (!newOrder.order_number || !newOrder.product_id || !newOrder.quantity) {
      alert("Order number, product and quantity are required");
      return;
    }

    try {
      const res = await authFetch(`${API_BASE}/orders/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_number: newOrder.order_number,
          product_id: Number(newOrder.product_id),
          quantity: Number(newOrder.quantity),
          status: newOrder.status,
        }),
      });

      if (!res.ok) throw new Error("Failed to create order");
      const data = await res.json();
      setOrders((prev) => [data, ...prev]);

      setNewOrder({
        order_number: "",
        product_id: "",
        quantity: "",
        status: "pending",
      });
    } catch (err) {
      console.error(err);
      setError("Could not create order.");
    }
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await authFetch(`${API_BASE}/auth/logout/`, { method: "POST" });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setToken("");
      setUsername("");
      setRole("User");
      setProducts([]);
      setSuppliers([]);
      setOrders([]);
      setActiveTab("overview");
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );


  if (!isAuthenticated) {
    return (
      <div className={`app ${theme}`}>
        <div className="login-wrapper">
          <div className="login-card">
            <h1 className="logo">
              Inventory<span>Pro</span>
            </h1>
            <p className="subtitle" style={{ marginBottom: 12 }}>
              Sign in or create an account to access your dashboard
            </p>
            <LoginForm
              setToken={setToken}
              setUsername={setUsername}
              setRole={setRole}
              setError={setError}
              theme={theme}
              setTheme={setTheme}
            />
            {error && <div className="login-error">{error}</div>}
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className={`app ${theme}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        <h1 className="logo">
          Inventory<span>Pro</span>
        </h1>
        <nav className="nav">
          <button
            className={activeTab === "overview" ? "nav-btn active" : "nav-btn"}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>

          {(role === "Admin" || role === "Staff") && (
            <button
              className={activeTab === "products" ? "nav-btn active" : "nav-btn"}
              onClick={() => setActiveTab("products")}
            >
              Products
            </button>
          )}

          {role === "Admin" && (
            <button
              className={activeTab === "suppliers" ? "nav-btn active" : "nav-btn"}
              onClick={() => setActiveTab("suppliers")}
            >
              Suppliers
            </button>
          )}

          <button
            className={activeTab === "orders" ? "nav-btn active" : "nav-btn"}
            onClick={() => setActiveTab("orders")}
          >
            Orders
          </button>

          <button
            className={activeTab === "profile" ? "nav-btn active" : "nav-btn"}
            onClick={() => setActiveTab("profile")}
          >
            Profile
          </button>

          {role === "Admin" && (
            <button
              className={activeTab === "users" ? "nav-btn active" : "nav-btn"}
              onClick={() => setActiveTab("users")}
            >
              Users
            </button>
          )}
        </nav>
      </aside>

      {/* Main */}
      <main className="main">
        <Navbar
          username={username || "User"}
          role={role}
          theme={theme}
          setTheme={setTheme}
          onLogout={handleLogout}
          onProfileClick={() => setActiveTab("profile")}
        />

        {error && (
          <div
            style={{
              background: "#451a1a",
              border: "1px solid #b91c1c",
              color: "#fecaca",
              padding: "6px 10px",
              borderRadius: 8,
              marginBottom: 6,
              fontSize: "0.8rem",
            }}
          >
            {error}
          </div>
        )}

        {loading && <p>Loading...</p>}

        <section className="content">
          {activeTab === "overview" && (
            <div className="overview-layout">
              <Overview
                products={products}
                orders={orders}
                totalProducts={totalProducts}
                totalSuppliers={totalSuppliers}
                lowStockCount={lowStockCount}
                totalStockQty={totalStockQty}
                pendingOrders={pendingOrders}
                completedOrders={completedOrders}
                cancelledOrders={cancelledOrders}
              />
              <RecentActivity
                products={products}
                orders={orders}
                suppliers={suppliers}
              />
            </div>
          )}

          {activeTab === "products" && (
            <ProductsTab
              products={filteredProducts}
              fullProducts={products}
              setSearchTerm={setSearchTerm}
              searchTerm={searchTerm}
              newProduct={newProduct}
              setNewProduct={setNewProduct}
              handleAddProduct={handleAddProduct}
              handleDeleteProduct={handleDeleteProduct}
              editingProduct={editingProduct}
              setEditingProduct={setEditingProduct}
              handleUpdateProduct={handleUpdateProduct}
              suppliers={suppliers}
              lowStockCount={lowStockCount}
              totalStockQty={totalStockQty}
            />
          )}

          {activeTab === "suppliers" && (
            <SuppliersTab
              suppliers={suppliers}
              newSupplier={newSupplier}
              setNewSupplier={setNewSupplier}
              handleAddSupplier={handleAddSupplier}
            />
          )}

          {activeTab === "orders" && (
            <OrdersTab
              orders={orders}
              products={products}
              newOrder={newOrder}
              setNewOrder={setNewOrder}
              handleAddOrder={handleAddOrder}
            />
          )}

          {activeTab === "profile" && <ProfileTab authFetch={authFetch} />}

          {activeTab === "users" && role === "Admin" && (
            <UsersTab authFetch={authFetch} />
          )}
        </section>
      </main>
    </div>
  );
}


function LoginForm({ setToken, setUsername, setRole, setError, }) {
  const [usernameInput, setUsernameInput] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const url = isRegistering
        ? `${API_BASE}/auth/register/`
        : `${API_BASE}/auth/login/`;

      const payload = isRegistering
        ? { username: usernameInput, password, email }
        : { username: usernameInput, password };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Invalid username or password");
        setSubmitting(false);
        return;
      }

      if (data.token) {
        setToken(data.token);
        setUsername(data.username || usernameInput);
        setRole(data.role || "User");
      } else {
        setError("No token returned from server.");
      }
    } catch (err) {
      console.error(err);
      setError("Could not reach server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Username
          <input
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            required
          />
        </label>

        {isRegistering && (
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </label>
        )}

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <button className="primary-btn" disabled={submitting}>
          {submitting
            ? isRegistering
              ? "Creating account..."
              : "Logging in..."
            : isRegistering
            ? "Register"
            : "Login"}
        </button>
      </form>

      <button
        className="theme-toggle"
        style={{ marginTop: 10 }}
        onClick={() => setIsRegistering(!isRegistering)}
      >
        {isRegistering
          ? "Already have an account? Login"
          : "Don’t have an account? Register"}
      </button>

    </>
  );
}


function Navbar({ username, role, theme, setTheme, onLogout, onProfileClick }) {
  const [open, setOpen] = useState(false);
  const initial = username ? username[0].toUpperCase() : "U";

  return (
    <header className="navbar">
      <div className="navbar-left">
        <h2 className="navbar-title">Dashboard</h2>
      </div>

      <div className="navbar-right">
        <button
          className="theme-toggle"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? "🌞" : "🌙"}
        </button>

        <div className="profile-wrapper">
          <button className="profile-btn" onClick={() => setOpen(!open)}>
            <div className="avatar">{initial}</div>
            <div className="profile-text">
              <span className="profile-name">{username || "User"}</span>
              <span className="profile-role">{role}</span>
            </div>
          </button>

          {open && (
            <div className="profile-dropdown">
              <button
                onClick={() => {
                  setOpen(false);
                  onProfileClick();
                }}
              >
                My Profile
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  onProfileClick();
                }}
              >
                Change Password
              </button>
              <div className="dropdown-divider" />
              <button
                className="danger"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}



function Overview({
  products,
  orders,
  totalProducts,
  totalSuppliers,
  lowStockCount,
  totalStockQty,
  pendingOrders,
  completedOrders,
  cancelledOrders,
}) {
  const stockData = products.map((p) => ({
    name: p.name,
    stock: p.stock,
  }));

  const orderStatusData = [
    { name: "Pending", value: pendingOrders },
    { name: "Completed", value: completedOrders },
    { name: "Cancelled", value: cancelledOrders },
  ];

  const stockStatusData = [
    {
      name: "OK stock",
      value: products.filter((p) => p.stock > p.reorder_level).length,
    },
    {
      name: "Low stock",
      value: products.filter((p) => p.stock <= p.reorder_level).length,
    },
  ];

  const COLORS = ["#22c55e", "#f97316", "#ef4444"];

  return (
    <div className="grid overview-fit" style={{ alignItems: "stretch" }}>
      {/* summary cards */}
      <div className="card" style={{ gridColumn: "1 / -1" }}>
        <div
          className="grid"
          style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}
        >
          <SummaryCard label="Total Products" value={totalProducts} />
          <SummaryCard label="Total Stock Qty" value={totalStockQty} />
          <SummaryCard label="Low Stock Items" value={lowStockCount} highlight />
          <SummaryCard label="Suppliers" value={totalSuppliers} />
        </div>
      </div>

      {/* charts */}
      <div className="card">
        <h3>Stock per Product</h3>
        {products.length === 0 ? (
          <p className="empty">No product data yet.</p>
        ) : (
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={stockData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="stock" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Stock Status</h3>
        <div style={{ width: "100%", height: 200 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={stockStatusData}
                dataKey="value"
                nameKey="name"
                outerRadius={70}
                label
              >
                {stockStatusData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3>Orders by Status</h3>
        <div style={{ width: "100%", height: 200 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={orderStatusData}
                dataKey="value"
                nameKey="name"
                outerRadius={70}
                label
              >
                {orderStatusData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginTop: 4 }}>
          Total orders: {orders.length}
        </p>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, highlight }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: "0.78rem", color: "#9ca3af" }}>{label}</p>
      <p
        className="card-number"
        style={highlight ? { color: "#f97316" } : undefined}
      >
        {value}
      </p>
    </div>
  );
}



function ProductsTab({
  products,
  fullProducts,
  setSearchTerm,
  searchTerm,
  newProduct,
  setNewProduct,
  handleAddProduct,
  handleDeleteProduct,
  editingProduct,
  setEditingProduct,
  handleUpdateProduct,
  suppliers,
  lowStockCount,
  totalStockQty,
}) {
  return (
    <div className="split">
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 8,
            alignItems: "center",
          }}
        >
          <div>
            <h3 style={{ margin: 0 }}>Products</h3>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "#9ca3af" }}>
              Total: {fullProducts.length} | Low stock: {lowStockCount} | Stock
              qty: {totalStockQty}
            </p>
          </div>
          <input
            placeholder="Search by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "5px 9px",
              borderRadius: "999px",
              border: "1px solid #1f2937",
              background: "#020617",
              color: "white",
              fontSize: "0.8rem",
            }}
          />
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Stock</th>
              <th>Reorder</th>
              <th>Supplier</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const isLow = p.stock <= p.reorder_level;
              return (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.sku}</td>
                  <td>{p.stock}</td>
                  <td>{p.reorder_level}</td>
                  <td>{p.supplier ? p.supplier.name : "-"}</td>
                  <td>
                    <span className={isLow ? "badge danger" : "badge ok"}>
                      {isLow ? "Low" : "OK"}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => setEditingProduct(p)}>Edit</button>
                    <button onClick={() => handleDeleteProduct(p.id)}>Delete</button>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan="7" className="empty">
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>{editingProduct ? "Edit Product" : "Add Product"}</h3>
        <form
          className="form"
          onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct}
        >
          <label>
            Name
            <input
              value={editingProduct ? editingProduct.name : newProduct.name}
              onChange={(e) =>
                editingProduct
                  ? setEditingProduct({ ...editingProduct, name: e.target.value })
                  : setNewProduct({ ...newProduct, name: e.target.value })
              }
              placeholder="e.g. Laptop"
            />
          </label>

          <label>
            SKU
            <input
              value={editingProduct ? editingProduct.sku : newProduct.sku}
              onChange={(e) =>
                editingProduct
                  ? setEditingProduct({ ...editingProduct, sku: e.target.value })
                  : setNewProduct({ ...newProduct, sku: e.target.value })
              }
              placeholder="e.g. LPT-001"
            />
          </label>

          <label>
            Stock
            <input
              type="number"
              value={editingProduct ? editingProduct.stock : newProduct.stock}
              onChange={(e) =>
                editingProduct
                  ? setEditingProduct({
                      ...editingProduct,
                      stock: Number(e.target.value),
                    })
                  : setNewProduct({ ...newProduct, stock: e.target.value })
              }
              min="0"
              placeholder="e.g. 10"
            />
          </label>

          <label>
            Reorder level
            <input
              type="number"
              value={
                editingProduct
                  ? editingProduct.reorder_level
                  : newProduct.reorder_level
              }
              onChange={(e) =>
                editingProduct
                  ? setEditingProduct({
                      ...editingProduct,
                      reorder_level: Number(e.target.value),
                    })
                  : setNewProduct({
                      ...newProduct,
                      reorder_level: e.target.value,
                    })
              }
              min="0"
              placeholder="e.g. 5"
            />
          </label>

          <label>
            Supplier
            <select
              value={
                editingProduct
                  ? editingProduct.supplier_id ??
                    (editingProduct.supplier ? editingProduct.supplier.id : "")
                  : newProduct.supplier_id
              }
              onChange={(e) =>
                editingProduct
                  ? setEditingProduct({
                      ...editingProduct,
                      supplier_id: e.target.value || null,
                    })
                  : setNewProduct({
                      ...newProduct,
                      supplier_id: e.target.value,
                    })
              }
            >
              <option value="">None</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <button className="primary-btn">
            {editingProduct ? "Update Product" : "Save Product"}
          </button>

          {editingProduct && (
            <button
              type="button"
              className="primary-btn"
              onClick={() => setEditingProduct(null)}
              style={{ background: "#374151", color: "white" }}
            >
              Cancel
            </button>
          )}
        </form>
      </div>
    </div>
  );
}



function SuppliersTab({ suppliers, newSupplier, setNewSupplier, handleAddSupplier }) {
  return (
    <div className="split">
      <div className="card">
        <h3>Suppliers</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.contact}</td>
                <td>{s.email}</td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr>
                <td colSpan="3" className="empty">
                  No suppliers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Add Supplier</h3>
        <form className="form" onSubmit={handleAddSupplier}>
          <label>
            Name
            <input
              value={newSupplier.name}
              onChange={(e) =>
                setNewSupplier({ ...newSupplier, name: e.target.value })
              }
              placeholder="Supplier name"
            />
          </label>

          <label>
            Contact
            <input
              value={newSupplier.contact}
              onChange={(e) =>
                setNewSupplier({ ...newSupplier, contact: e.target.value })
              }
              placeholder="+2547..."
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={newSupplier.email}
              onChange={(e) =>
                setNewSupplier({ ...newSupplier, email: e.target.value })
              }
              placeholder="email@example.com"
            />
          </label>

          <button className="primary-btn">Save Supplier</button>
        </form>
      </div>
    </div>
  );
}



function OrdersTab({ orders, products, newOrder, setNewOrder, handleAddOrder }) {
  return (
    <div className="split">
      <div className="card">
        <h3>Orders</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.order_number}</td>
                <td>{o.product ? o.product.name : "-"}</td>
                <td>{o.quantity}</td>
                <td>
                  <span
                    className={
                      o.status === "pending"
                        ? "badge warning"
                        : o.status === "completed"
                        ? "badge ok"
                        : "badge danger"
                    }
                  >
                    {o.status}
                  </span>
                </td>
                <td>
                  {o.created_at
                    ? new Date(o.created_at).toLocaleString()
                    : "-"}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan="5" className="empty">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Add Order</h3>
        <form className="form" onSubmit={handleAddOrder}>
          <label>
            Order Number
            <input
              value={newOrder.order_number}
              onChange={(e) =>
                setNewOrder({ ...newOrder, order_number: e.target.value })
              }
              placeholder="e.g. ORD-1001"
            />
          </label>

          <label>
            Product
            <select
              value={newOrder.product_id}
              onChange={(e) =>
                setNewOrder({ ...newOrder, product_id: e.target.value })
              }
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Quantity
            <input
              type="number"
              value={newOrder.quantity}
              onChange={(e) =>
                setNewOrder({ ...newOrder, quantity: e.target.value })
              }
              min="1"
              placeholder="e.g. 5"
            />
          </label>

          <label>
            Status
            <select
              value={newOrder.status}
              onChange={(e) =>
                setNewOrder({ ...newOrder, status: e.target.value })
              }
            >
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <button className="primary-btn">Save Order</button>
        </form>
      </div>
    </div>
  );
}



function ProfileTab({ authFetch }) {
  const [profile, setProfile] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [pwOld, setPwOld] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await authFetch(`${API_BASE}/auth/profile/`);
        const data = await res.json();
        setProfile(data);
      } catch (e) {
        console.error(e);
      }
    };
    loadProfile();
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await authFetch(`${API_BASE}/auth/profile/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      setMessage(data.message || "Profile updated");
    } catch (e) {
      setMessage("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwMsg("");
    try {
      const res = await authFetch(`${API_BASE}/auth/change-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          old_password: pwOld,
          new_password: pwNew,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwMsg(data.error || "Failed to change password");
      } else {
        setPwMsg(data.message || "Password changed");
        setPwOld("");
        setPwNew("");
      }
    } catch (e) {
      setPwMsg("Failed to change password");
    }
  };

  return (
    <div className="split">
      <div className="card">
        <h3>Profile</h3>
        <form className="form" onSubmit={handleProfileSave}>
          <label>
            Username
            <input value={profile.username} disabled />
          </label>
          <label>
            Email
            <input
              value={profile.email || ""}
              onChange={(e) =>
                setProfile({ ...profile, email: e.target.value })
              }
            />
          </label>
          <label>
            First name
            <input
              value={profile.first_name || ""}
              onChange={(e) =>
                setProfile({ ...profile, first_name: e.target.value })
              }
            />
          </label>
          <label>
            Last name
            <input
              value={profile.last_name || ""}
              onChange={(e) =>
                setProfile({ ...profile, last_name: e.target.value })
              }
            />
          </label>

          <button className="primary-btn" disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </button>
          {message && (
            <p style={{ fontSize: "0.75rem", marginTop: 6 }}>{message}</p>
          )}
        </form>
      </div>

      <div className="card">
        <h3>Change Password</h3>
        <form className="form" onSubmit={handlePasswordChange}>
          <label>
            Old password
            <input
              type="password"
              value={pwOld}
              onChange={(e) => setPwOld(e.target.value)}
            />
          </label>
          <label>
            New password
            <input
              type="password"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
            />
          </label>
          <button className="primary-btn">Update Password</button>
          {pwMsg && (
            <p style={{ fontSize: "0.75rem", marginTop: 6 }}>{pwMsg}</p>
          )}
        </form>
      </div>
    </div>
  );
}



function UsersTab({ authFetch }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await authFetch(`${API_BASE}/users/`);
        if (res.status === 403) {
          setError("You are not allowed to view users.");
          return;
        }
        const data = await res.json();
        setUsers(data);
      } catch (e) {
        console.error(e);
        setError("Failed to load users.");
      }
    };
    loadUsers();
  }, []);

  return (
    <div className="card">
      <h3>Users (Admin)</h3>
      {error && (
        <p style={{ fontSize: "0.8rem", color: "#fca5a5", marginBottom: 6 }}>
          {error}
        </p>
      )}
      <table className="table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{new Date(u.date_joined).toLocaleDateString()}</td>
            </tr>
          ))}
          {users.length === 0 && !error && (
            <tr>
              <td colSpan="4" className="empty">
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}


function RecentActivity({ products, orders, suppliers }) {
  return (
    <div className="card">
      <h3>Recent Activity</h3>

      <div className="activity-section">
        <p className="activity-title">Latest Products</p>
        {products
          .slice(-3)
          .reverse()
          .map((p) => (
            <p key={p.id} className="activity-item">
              {p.name} — Stock: {p.stock}
            </p>
          ))}
        {products.length === 0 && <p className="empty">No products yet.</p>}
      </div>

      <div className="activity-section">
        <p className="activity-title">Latest Orders</p>
        {orders
          .slice(-3)
          .reverse()
          .map((o) => (
            <p key={o.id} className="activity-item">
              {o.order_number} — {o.status}
            </p>
          ))}
        {orders.length === 0 && <p className="empty">No orders yet.</p>}
      </div>

      <div className="activity-section">
        <p className="activity-title">Latest Suppliers</p>
        {suppliers
          .slice(-3)
          .reverse()
          .map((s) => (
            <p key={s.id} className="activity-item">
              {s.name}
            </p>
          ))}
        {suppliers.length === 0 && (
          <p className="empty">No suppliers yet.</p>
        )}
      </div>
    </div>
  );
}

export default App;
