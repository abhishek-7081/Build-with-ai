import React from "react";
import { AnalyticsView } from "../components/analytics/AnalyticsView";

export function AnalyticsPage({ complaints }) {
  return <AnalyticsView complaints={complaints} />;
}
