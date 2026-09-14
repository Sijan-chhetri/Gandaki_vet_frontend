import {
  ArrowLeft,
  LogIn,
  ShieldAlert,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

function Unauthorized() {
  const navigate = useNavigate();

  const handleLogin = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login", {
      replace: true,
    });
  };

  return (
    <div
      className="
        min-vh-100
        d-flex
        align-items-center
        justify-content-center
        bg-light
        px-3
      "
    >
      <div
        className="
          card
          border-0
          shadow-sm
          rounded-4
          text-center
          w-100
        "
        style={{
          maxWidth: "550px",
        }}
      >
        <div className="card-body p-5">
          <div
            className="
              d-inline-flex
              align-items-center
              justify-content-center
              rounded-circle
              bg-danger-subtle
              text-danger
              mb-4
            "
            style={{
              width: "75px",
              height: "75px",
            }}
          >
            <ShieldAlert size={36} />
          </div>

          <h2 className="fw-bold mb-3">
            Access Denied
          </h2>

          <p className="text-secondary mb-4">
            You are logged in, but your role
            does not have permission to access
            this page.
          </p>

          <div
            className="
              d-flex
              justify-content-center
              flex-wrap
              gap-2
            "
          >
            <button
              type="button"
              className="
                btn
                btn-primary
                d-flex
                align-items-center
                gap-2
              "
              onClick={() =>
                navigate("/dashboard", {
                  replace: true,
                })
              }
            >
              <ArrowLeft size={17} />

              Dashboard
            </button>

            <button
              type="button"
              className="
                btn
                btn-outline-secondary
                d-flex
                align-items-center
                gap-2
              "
              onClick={handleLogin}
            >
              <LogIn size={17} />

              Login as another user
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Unauthorized;