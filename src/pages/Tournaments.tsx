import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Tournaments = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/tour", { replace: true });
  }, [navigate]);
  return null;
};

export default Tournaments;
