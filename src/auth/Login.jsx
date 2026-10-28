import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  PawPrint,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";


export default function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem("vetnearyRememberedEmail");

    if (rememberedEmail) {
      setFormData((previous) => ({
        ...previous,
        email: rememberedEmail,
      }));
    }
  }, []);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));

    setFormError("");
  }

  function validateForm() {
    const email = formData.email.trim();

    if (!email || !formData.password) {
      return "Please enter your email and password.";
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return "Please enter a valid email address.";
    }

    // if (formData.password.length < 6) {
    //   return "Password must contain at least 6 characters.";
    // }

    return "";
  }



async function handleSubmit(event) {
  event.preventDefault();

  const validationError = validateForm();

  if (validationError) {
    setFormError(validationError);
    return;
  }

  setIsSubmitting(true);
  setFormError("");

  try {
    // ==========================================
    // 1. LOGIN API
    // ==========================================

    const response = await fetch(
      `${API_BASE_URL}/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      }
    );

    const data = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      throw new Error(
        data?.message ||
          "Unable to log in. Please check your credentials."
      );
    }

    // ==========================================
    // 2. GET USER AND ACCESS TOKEN
    // ==========================================

    const responseData = data?.data ?? data;

    const accessToken =
      responseData?.accessToken ??
      responseData?.token ??
      data?.accessToken;

    const user =
      responseData?.user ?? data?.user;

    if (!accessToken || !user) {
      throw new Error(
        "The login response is missing the user or access token."
      );
    }

    // ==========================================
    // 3. EXTRACT BRANCH DETAILS
    // ==========================================

    // Supports branch data inside user (preferred),
    // or as separate fields in the API response.

    const branches = Array.isArray(user.branches)
      ? user.branches
      : Array.isArray(responseData?.branches)
        ? responseData.branches
        : [];

    const branchIds = branches.map(
      (branch) => branch.id
    );

    const allBranchesAccess = [
      "ADMIN",
      "SUPER_ADMIN",
    ].includes(user.role);

    // ==========================================
    // 4. SELECT DEFAULT BRANCH
    // ==========================================

    // Keep previously selected branch only if
    // it is accessible to this same user.
    const previousUserId =
      localStorage.getItem("userId");

    const previousBranchId =
      previousUserId === user.id
        ? localStorage.getItem("selectedBranchId")
        : null;

    const previousBranch = branches.find(
      (branch) => branch.id === previousBranchId
    );

    const mainBranch = branches.find(
      (branch) => branch.isMain
    );

    const selectedBranch =
      previousBranch ||
      mainBranch ||
      branches[0] ||
      null;

    const selectedBranchId =
      selectedBranch?.id || "";

    // ==========================================
    // 5. SAVE AUTHENTICATION DATA
    // ==========================================

    localStorage.setItem(
      "accessToken",
      accessToken
    );

    localStorage.setItem(
      "token",
      accessToken
    );

    localStorage.setItem(
      "userId",
      user.id
    );

    localStorage.setItem(
      "clinicId",
      user.clinicId
    );

    // ==========================================
    // 6. SAVE BRANCH INFORMATION
    // ==========================================

    const updatedUser = {
      ...user,
      branches,
      branchIds,
      allBranchesAccess,
      defaultBranchId:
        user.defaultBranchId || selectedBranchId,
      selectedBranchId,
    };

    localStorage.setItem(
      "user",
      JSON.stringify(updatedUser)
    );

    // All accessible branches
    localStorage.setItem(
      "branches",
      JSON.stringify(branches)
    );

    // Array of branch IDs
    localStorage.setItem(
      "branchIds",
      JSON.stringify(branchIds)
    );

    // Admin permission
    localStorage.setItem(
      "allBranchesAccess",
      JSON.stringify(allBranchesAccess)
    );

    // Currently selected branch ID
    localStorage.setItem(
      "selectedBranchId",
      selectedBranchId
    );

    // Currently selected branch object
    if (selectedBranch) {
      localStorage.setItem(
        "selectedBranch",
        JSON.stringify(selectedBranch)
      );
    } else {
      localStorage.removeItem("selectedBranch");
    }

    // ==========================================
    // 7. DEBUG BRANCH INFORMATION
    // ==========================================

    console.log("[LOGIN] Login successful");

    console.log("[LOGIN] User:", {
      id: user.id,
      role: user.role,
      clinicId: user.clinicId,
    });

    console.log("[LOGIN] Branches received:", branches);

    console.log("[LOGIN] Branch IDs:", branchIds);

    console.log(
      "[LOGIN] Selected branch:",
      selectedBranch
    );

    console.log(
      "[LOGIN] All branch access:",
      allBranchesAccess
    );

    console.log("[LOGIN] Saved to localStorage:", {
      userId: localStorage.getItem("userId"),
      clinicId: localStorage.getItem("clinicId"),
      branches: JSON.parse(
        localStorage.getItem("branches") || "[]"
      ),
      branchIds: JSON.parse(
        localStorage.getItem("branchIds") || "[]"
      ),
      selectedBranchId: localStorage.getItem(
        "selectedBranchId"
      ),
    });

    if (branches.length === 0) {
      console.warn(
        "[LOGIN] No accessible branches returned by login API. Check the backend login response and UserBranch assignments."
      );
    }

    // ==========================================
    // 8. REMEMBER EMAIL
    // ==========================================

    if (formData.rememberMe) {
      localStorage.setItem(
        "vetnearyRememberedEmail",
        formData.email.trim()
      );
    } else {
      localStorage.removeItem(
        "vetnearyRememberedEmail"
      );
    }

    // ==========================================
    // 9. REDIRECT TO DASHBOARD
    // ==========================================

    navigate("/dashboard", {
      replace: true,
    });
  } catch (error) {
    console.error("[LOGIN] Error:", error.message);

    setFormError(
      error.message ||
        "Unable to log in. Please try again."
    );
  } finally {
    setIsSubmitting(false);
  }
}


 

  return (
    <div className="login-page">
      <div className="login-background-shape login-shape-one" />
      <div className="login-background-shape login-shape-two" />
      <div className="login-background-shape login-shape-three" />

      <div className="container-fluid min-vh-100">
        <div className="row min-vh-100">
          <section className="col-lg-6 d-none d-lg-flex login-showcase position-relative overflow-hidden">
            <div className="showcase-orb showcase-orb-one" />
            <div className="showcase-orb showcase-orb-two" />

            <div className="position-relative z-1 d-flex flex-column justify-content-between w-100 p-5">
              <Link
                to="/"
                className="d-inline-flex align-items-center gap-3 text-decoration-none text-dark"
              >
                <span className="brand-icon">
                  <Stethoscope size={27} />
                </span>

                <span>
                  <span className="d-block fw-bold fs-5">
                    Gandaki vet and pet
                  </span>
                  <small className="text-secondary">
                    Veterinary Clinic
                  </small>
                </span>
              </Link>

              <div className="showcase-content">
                <div className="d-inline-flex align-items-center gap-2 bg-white bg-opacity-75 px-3 py-2 rounded-pill text-primary small fw-semibold mb-4">
                  <Sparkles size={16} />
                  Veterinary management made simple
                </div>

                <h1 className="display-5 fw-bold mb-4">
                  Run your veterinary clinic with clarity and confidence.
                </h1>

                <p className="text-secondary fs-5 mb-5" style={{ maxWidth: 570 }}>
                  Manage patients, appointments, vaccination schedules,
                  inventory, billing and staff from one secure workspace.
                </p>

                <div className="d-grid gap-3">
                  <Feature
                    icon={PawPrint}
                    title="Complete patient records"
                    description="Keep medical histories, owner details and treatment records organized."
                  />

                  <Feature
                    icon={ShieldCheck}
                    title="Secure clinic information"
                    description="Protect sensitive clinic and patient data with account-level access."
                  />

                  <Feature
                    icon={CheckCircle2}
                    title="Better daily workflow"
                    description="Reduce manual work and keep every clinic task easy to track."
                  />
                </div>
              </div>

              <div className="small text-secondary">
                © 2026 VetNeary. All rights reserved.
              </div>
            </div>
          </section>

          <main className="col-lg-6 d-flex align-items-center justify-content-center p-3 p-md-5">
            <div className="login-panel w-100">
              <div className="d-lg-none d-flex justify-content-center mb-4">
                <Link
                  to="/"
                  className="d-inline-flex align-items-center gap-3 text-decoration-none text-dark"
                >
                  <span className="brand-icon">
                    <Stethoscope size={25} />
                  </span>

                  <span>
                    <span className="d-block fw-bold">
                      Gandaki vet and pet
                    </span>
                    <small className="text-secondary">
                      Veterinary Clinic
                    </small>
                  </span>
                </Link>
              </div>

              <div className="login-card bg-white rounded-4 shadow-lg p-4 p-md-5">
                <div className="mb-4">
                  <div className="login-heading-icon mb-4">
                    <LockKeyhole size={24} />
                  </div>

                  <h2 className="fw-bold mb-2">Welcome back</h2>

                  <p className="text-secondary mb-0">
                    Sign in to continue to your clinic dashboard.
                  </p>
                </div>

                {formError && (
                  <div className="alert alert-danger rounded-4 py-3">
                    {formError}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label
                      htmlFor="login-email"
                      className="form-label fw-semibold"
                    >
                      Email address
                    </label>

                    <div className="input-group login-input-group">
                      <span className="input-group-text bg-white border-end-0">
                        <Mail size={18} />
                      </span>

                      <input
                        id="login-email"
                        type="email"
                        name="email"
                        className="form-control border-start-0"
                        placeholder="name@clinic.com"
                        value={formData.email}
                        onChange={handleChange}
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <label
                        htmlFor="login-password"
                        className="form-label fw-semibold"
                      >
                        Password
                      </label>

                      <Link
                        to="/forgot-password"
                        className="small text-decoration-none"
                      >
                        Forgot password?
                      </Link>
                    </div>

                    <div className="input-group login-input-group">
                      <span className="input-group-text bg-white border-end-0">
                        <LockKeyhole size={18} />
                      </span>

                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        name="password"
                        className="form-control border-start-0 border-end-0"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleChange}
                        autoComplete="current-password"
                      />

                      <button
                        type="button"
                        className="input-group-text bg-white border-start-0"
                        onClick={() => setShowPassword((previous) => !previous)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <label className="form-check d-flex align-items-center gap-2 m-0">
                      <input
                        type="checkbox"
                        name="rememberMe"
                        className="form-check-input m-0"
                        checked={formData.rememberMe}
                        onChange={handleChange}
                      />

                      <span className="small">Remember me</span>
                    </label>

                    <span className="security-label small text-secondary d-flex align-items-center gap-1">
                      <ShieldCheck size={15} />
                      Secure login
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-100 py-3 fw-semibold d-flex align-items-center justify-content-center gap-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm"
                          aria-hidden="true"
                        />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>

                <div className="login-divider my-4">
                  <span>or continue with</span>
                </div>

                <button
                  type="button"
                  className="btn btn-light border w-100 py-3 d-flex align-items-center justify-content-center gap-3"
                >
                  <span className="google-mark">G</span>
                  Continue with Google
                </button>

                {/* <p className="text-center text-secondary small mt-4 mb-0">
                  Need a clinic account?{" "}
                  <Link
                    to="/register"
                    className="fw-semibold text-decoration-none"
                  >
                    Create an account
                  </Link>
                </p> */}
              </div>

              <div className="text-center mt-4 small text-secondary">
                By signing in, you agree to the{" "}
                <Link to="/terms" className="text-secondary">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-secondary">
                  Privacy Policy
                </Link>
                .
              </div>
            </div>
          </main>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(
              135deg,
              rgba(var(--bs-primary-rgb), .045),
              rgba(var(--bs-primary-rgb), .015)
            ),
            #f8fafc;
        }

        .login-background-shape {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(3px);
          background: rgba(var(--bs-primary-rgb), .06);
        }

        .login-shape-one {
          width: 260px;
          height: 260px;
          top: -100px;
          right: -80px;
        }

        .login-shape-two {
          width: 160px;
          height: 160px;
          bottom: 6%;
          right: 8%;
        }

        .login-shape-three {
          width: 110px;
          height: 110px;
          left: 42%;
          top: 20%;
        }

        .login-showcase {
          background:
            linear-gradient(
              145deg,
              rgba(var(--bs-primary-rgb), .14),
              rgba(var(--bs-primary-rgb), .04)
            ),
            #ffffff;
          border-right: 1px solid rgba(var(--bs-primary-rgb), .1);
        }

        .showcase-orb {
          position: absolute;
          border-radius: 50%;
          background: rgba(var(--bs-primary-rgb), .08);
        }

        .showcase-orb-one {
          width: 320px;
          height: 320px;
          top: -120px;
          right: -100px;
        }

        .showcase-orb-two {
          width: 210px;
          height: 210px;
          bottom: -80px;
          left: -60px;
        }

        .brand-icon,
        .login-heading-icon,
        .feature-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--bs-primary);
          background: rgba(var(--bs-primary-rgb), .11);
        }

        .brand-icon {
          width: 46px;
          height: 46px;
          border-radius: 15px;
          flex-shrink: 0;
        }

        .login-heading-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
        }

        .feature-icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          flex-shrink: 0;
        }

        .showcase-content {
          max-width: 650px;
        }

        .login-panel {
          max-width: 560px;
        }

        .login-card {
          border: 1px solid rgba(var(--bs-primary-rgb), .1);
        }

        .login-input-group .input-group-text,
        .login-input-group .form-control {
          min-height: 52px;
        }

        .login-input-group .input-group-text {
          color: var(--bs-secondary-color);
        }

        .login-input-group .form-control:focus {
          box-shadow: none;
          border-color: var(--bs-border-color);
        }

        .security-label {
          white-space: nowrap;
        }

        .login-divider {
          display: flex;
          align-items: center;
          gap: 14px;
          color: var(--bs-secondary-color);
          font-size: .82rem;
        }

        .login-divider::before,
        .login-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: var(--bs-border-color);
        }

        .google-mark {
          width: 25px;
          height: 25px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #fff;
          border: 1px solid var(--bs-border-color);
          font-weight: 700;
          color: #4285f4;
        }

        @media (max-width: 575.98px) {
          .login-card {
            padding: 24px !important;
          }

          .security-label {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function Feature({ icon: Icon, title, description }) {
  return (
    <div className="d-flex align-items-start gap-3">
      <span className="feature-icon">
        <Icon size={20} />
      </span>

      <div>
        <h6 className="fw-bold mb-1">{title}</h6>
        <p className="text-secondary small mb-0">{description}</p>
      </div>
    </div>
  );
}
