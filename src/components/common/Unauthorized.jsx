import {
  ArrowLeft,
  ShieldAlert,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="container py-5">
      <div
        className="
          card
          border-0
          shadow-sm
          rounded-4
          mx-auto
          text-center
        "
        style={{
          maxWidth: "560px",
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
              width: "72px",
              height: "72px",
            }}
          >
            <ShieldAlert size={34} />
          </div>

          <h2 className="fw-bold">
            Access denied
          </h2>

          <p className="text-secondary mb-4">
            Your account does not have
            permission to access this page.
          </p>

          <button
            type="button"
            className="
              btn
              btn-primary
              d-inline-flex
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
            Return to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default Unauthorized;