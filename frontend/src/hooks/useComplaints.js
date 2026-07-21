import { useContext } from "react";
import { ComplaintsContext } from "../context/ComplaintsContext";

export function useComplaints() {
  const context = useContext(ComplaintsContext);
  if (!context) {
    throw new Error("useComplaints must be used within a ComplaintsProvider");
  }
  return context;
}
