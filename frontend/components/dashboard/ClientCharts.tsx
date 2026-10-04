"use client";

import dynamic from "next/dynamic";

export const DriftDonut = dynamic(() => import("./DriftDonut"), { ssr: false });
export const RecentHoursChart = dynamic(() => import("./RecentHoursChart"), { ssr: false });
