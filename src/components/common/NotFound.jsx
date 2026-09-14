import {
  ArrowLeft,
  Home,
  SearchX,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

function NotFound() {
  const navigate = useNavigate();

  const token =
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token");

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
        className="text-center"
        style={{
          maxWidth: "550px",
        }}
      >
        <div
          className="
            d-inline-flex
            align-items-center
            justify-content-center
            rounded-circle
            bg-primary-subtle
            text-primary
            mb-4
          "
          style={{
            width: "80px",
            height: "80px",
          }}
        >
          <SearchX size={38} />
        </div>

        <h1
          className="
            display-1
            fw-bold
            mb-0
          "
        >
          404
        </h1>

        <h3 className="fw-bold mb-3">
          Page not found
        </h3>

        <p className="text-secondary mb-4">
          The page you are looking for does not
          exist or may have been moved.
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
              btn-outline-secondary
              d-flex
              align-items-center
              gap-2
            "
            onClick={() =>
              navigate(-1)
            }
          >
            <ArrowLeft size={17} />

            Go back
          </button>

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
              navigate(
                token
                  ? "/dashboard"
                  : "/login",
                {
                  replace: true,
                },
              )
            }
          >
            <Home size={17} />

            {token
              ? "Dashboard"
              : "Login"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotFound;