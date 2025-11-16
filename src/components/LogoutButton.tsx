import React from "react";
import { useNavigate } from "react-router-dom";
import { clearTokens } from "../utils/auth";

type Props = {
  label?: string;
};

export default function LogoutButton({ label = "Logout" }: Props) {
  const navigate = useNavigate();

  const doLogout = () => {
    clearTokens();
    // Optionally clear other app state here (redux, caches, etc.)
    navigate("/login", { replace: true });
  };

  return (
    <button
      onClick={doLogout}
      className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 text-sm"
    >
      {label}
    </button>
  );
}
