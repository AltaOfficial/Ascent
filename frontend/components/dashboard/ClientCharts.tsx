"use client";

import dynamic from "next/dynamic";

export const DriftDonut = dynamic(() => import("./DriftDonut"), { ssr: false });
export const MiniLine = dynamic(() => import("./MiniLine"), { ssr: false });
