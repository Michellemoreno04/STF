/**
 * commissionUtils.ts
 *
 * Helpers to load the CommissionsPage table data and resolve
 * per-product commission rates for the AddProductModal.
 *
 * Strategy:
 * - Tier is stored in Firestore at users/{uid}/settings/commissionsTier
 * - Commission table is at users/{uid}/settings/commissionsTable
 * - If Firestore data doesn't exist yet, falls back to defaultTableData
 *   so the modal always shows meaningful commissions immediately.
 * - For Data Adds: rate per speed from the tier's NonSubData table (row[0] = base)
 * - For Lines: portedLines from MobileAdd table (row[0])
 * - For Devices: deviceSales from MobileAdd table (row[0])
 * - For TV: first video payout
 * - For Asurion: first Per Unit payout from asurionTotal
 */

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";

// ─── Types (mirrors CommissionsPage) ────────────────────────────────────────

export interface DataAddRow {
  yieldMin: string;
  yieldMax: string;
  tier: number;
  fastpass: string;
  sub300: string;
  s300_500: string;
  s1gig: string;
  s2gigPlus: string;
}

export interface MobileAddRow {
  yieldMin: string;
  yieldMax: string;
  tier: number;
  portedLines: string;
  deviceSales: string;
  unlimited: string;
  twoPlus: string;
}

export interface VideoRow {
  label: string;
  payout: string;
}

export interface AsurionRow {
  attachRate: string;
  payout: string;
  type: string;
}

export interface CommissionTableData {
  tier1NonSubData: DataAddRow[];
  tier3NonSubData: DataAddRow[];
  tier1MobileAdd: MobileAddRow[];
  tier3MobileAdd: MobileAddRow[];
  video: VideoRow[];
  asurionTotal: AsurionRow[];
  asurionMDP: AsurionRow[];
  revCall: { label: string; tier: string; goal: string; payout: string }[];
  ssu: { label: string; tier: string; goal: string; payout: string }[];
  errorRate: { errorMin: string; errorMax: string; payout: string; type: string }[];
  qualifiers: string[];
}

/** Flat map of commission rates used by the modal */
export interface FlatRates {
  lines: number;
  devices: number;
  asurion: number;
  tv: number;
  revenue: number;
  Phone: number;
  selfInstall: number;
  /** Data Add rates keyed by speed label (e.g. "100mbps", "1gb") */
  internet: Record<string, number>;
}

// ─── Default data (mirrors CommissionsPage defaultData) ─────────────────────
// Used as fallback when Firestore document doesn't exist yet.

export const defaultTableData: CommissionTableData = {
  qualifiers: [
    "95% of hours completion",
    "90% receive 50% commission",
    "90% schedule adherence",
    "Asurion At 50% or above",
  ],
  tier1NonSubData: [
    { yieldMin: "0.00%", yieldMax: "61.49%", tier: 1, fastpass: "$0.38", sub300: "$1.13", s300_500: "$3.02", s1gig: "$4.52", s2gigPlus: "$6.03" },
    { yieldMin: "61.50%", yieldMax: "81.90%", tier: 2, fastpass: "$0.57", sub300: "$1.51", s300_500: "$4.52", s1gig: "$6.03", s2gigPlus: "$7.54" },
    { yieldMin: "82%", yieldMax: "102.49%", tier: 3, fastpass: "$1.51", sub300: "$6.03", s300_500: "$9.05", s1gig: "$12.06", s2gigPlus: "$15.08" },
    { yieldMin: "102.50%", yieldMax: "+", tier: 4, fastpass: "$3.02", sub300: "$9.05", s300_500: "$12.06", s1gig: "$15.08", s2gigPlus: "$22.62" },
  ],
  tier3NonSubData: [
    { yieldMin: "0.00%", yieldMax: "56.90%", tier: 1, fastpass: "$0.38", sub300: "$0.57", s300_500: "$1.51", s1gig: "$3.02", s2gigPlus: "$4.52" },
    { yieldMin: "57.00%", yieldMax: "75.90%", tier: 2, fastpass: "$0.57", sub300: "$0.75", s300_500: "$3.02", s1gig: "$4.52", s2gigPlus: "$7.54" },
    { yieldMin: "76%", yieldMax: "94.90%", tier: 3, fastpass: "$0.75", sub300: "$3.02", s300_500: "$4.52", s1gig: "$6.03", s2gigPlus: "$9.38" },
    { yieldMin: "95.00%", yieldMax: "+", tier: 4, fastpass: "$1.51", sub300: "$4.52", s300_500: "$6.03", s1gig: "$7.54", s2gigPlus: "$11.31" },
  ],
  tier1MobileAdd: [
    { yieldMin: "0.00%", yieldMax: "4.40%", tier: 1, portedLines: "$0.75", deviceSales: "$0.75", unlimited: "$0.75", twoPlus: "$4.52" },
    { yieldMin: "4.50%", yieldMax: "5.90%", tier: 2, portedLines: "$1.51", deviceSales: "$1.51", unlimited: "$1.51", twoPlus: "$6.03" },
    { yieldMin: "6%", yieldMax: "7.40%", tier: 3, portedLines: "$3.02", deviceSales: "$3.02", unlimited: "$3.02", twoPlus: "$7.54" },
    { yieldMin: "7.50%", yieldMax: "+", tier: 4, portedLines: "$6.03", deviceSales: "$6.03", unlimited: "$6.03", twoPlus: "$9.05" },
  ],
  tier3MobileAdd: [
    { yieldMin: "0.00%", yieldMax: "3.70%", tier: 1, portedLines: "$0.38", deviceSales: "$0.38", unlimited: "$0.38", twoPlus: "$1.51" },
    { yieldMin: "3.80%", yieldMax: "4.90%", tier: 2, portedLines: "$0.75", deviceSales: "$0.75", unlimited: "$0.75", twoPlus: "$3.02" },
    { yieldMin: "5%", yieldMax: "6%", tier: 3, portedLines: "$1.51", deviceSales: "$1.51", unlimited: "$1.51", twoPlus: "$6.03" },
    { yieldMin: "6.30%", yieldMax: "+", tier: 4, portedLines: "$3.02", deviceSales: "$3.02", unlimited: "$3.02", twoPlus: "$7.54" },
  ],
  video: [
    { label: "Everything TV", payout: "$3.77" },
    { label: "Extra TV", payout: "$2.26" },
    { label: "Entertainment TV", payout: "$0.75" },
    { label: "All other Tiers", payout: "$0.75" },
  ],
  revCall: [
    { label: "Total Rev/calls", tier: "Tier 3", goal: "$8.00", payout: "5%" },
    { label: "Total Rev/calls", tier: "Tier 1", goal: "$25.00", payout: "10%" },
  ],
  ssu: [
    { label: "Self Set Up", tier: "Tier 3", goal: "60%", payout: "5%" },
    { label: "Self Set Up", tier: "Tier 1", goal: "70%", payout: "10%" },
  ],
  asurionTotal: [
    { attachRate: "40%", payout: "$15.08", type: "Flat Rate" },
    { attachRate: "50%", payout: "$0.04", type: "Per Unit" },
    { attachRate: "60%", payout: "$0.80", type: "Per Unit" },
  ],
  asurionMDP: [
    { attachRate: "15%", payout: "$15.08", type: "Flat Rate" },
    { attachRate: "20%", payout: "$0.04", type: "Per Unit" },
    { attachRate: "30%", payout: "$0.80", type: "Per Unit" },
  ],
  errorRate: [
    { errorMin: "0%", errorMax: "1.99%", payout: "10%", type: "Increase to total bonus payout" },
    { errorMin: "2%", errorMax: "9.99%", payout: "-20%", type: "deduction to total bonus payout" },
    { errorMin: "10%", errorMax: "+", payout: "-50%", type: "deduction to total bonus payout" },
  ],
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Strip "$" and parse to number, returns 0 on failure. */
function parseMoney(val: string): number {
  const cleaned = (val ?? "").replace(/[$%\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/** Map modal speed label → DataAddRow column */
const speedColumnMap: Record<string, keyof DataAddRow> = {
  fastpass: "fastpass",
  "100mbps": "sub300",
  "200mbps": "sub300",
  "300mbps": "sub300",
  "500mbps": "s300_500",
  "1gb": "s1gig",
  "2gb": "s2gigPlus",
  "5g": "s2gigPlus",
  "8gb": "s2gigPlus",
};

/**
 * Build FlatRates from CommissionTableData for a given tier.
 *
 * Uses row[0] (the lowest/base bracket) as the guaranteed minimum payout.
 * Falls back to defaultTableData for any missing arrays so the modal
 * always shows real commission values even before the user saves in CommissionsPage.
 */
export function buildFlatRates(
  tableData: Partial<CommissionTableData>,
  userTier: "tier1" | "tier2"
): FlatRates {
  const isTier1 = userTier === "tier1";

  // Merge Firestore data with defaults — keep defaults for missing/empty arrays
  const t1NSD = tableData.tier1NonSubData?.length ? tableData.tier1NonSubData : defaultTableData.tier1NonSubData;
  const t3NSD = tableData.tier3NonSubData?.length ? tableData.tier3NonSubData : defaultTableData.tier3NonSubData;
  const t1MA  = tableData.tier1MobileAdd?.length  ? tableData.tier1MobileAdd  : defaultTableData.tier1MobileAdd;
  const t3MA  = tableData.tier3MobileAdd?.length  ? tableData.tier3MobileAdd  : defaultTableData.tier3MobileAdd;
  const video = tableData.video?.length            ? tableData.video            : defaultTableData.video;
  const asurionTotal = tableData.asurionTotal?.length ? tableData.asurionTotal : defaultTableData.asurionTotal;

  const nonSubRows = isTier1 ? t1NSD : t3NSD;
  const mobileRows = isTier1 ? t1MA : t3MA;

  // Use row[0] — the base (lowest) guaranteed bracket
  const baseNonSub = nonSubRows[0];
  const baseMobile = mobileRows[0];

  // Data Add rates per speed
  const internet: Record<string, number> = {};
  const modalSpeeds = ["100mbps", "200mbps", "300mbps", "500mbps", "1gb", "2gb", "5g", "8gb"];
  modalSpeeds.forEach((speed) => {
    const col = speedColumnMap[speed];
    internet[speed] = baseNonSub ? parseMoney(baseNonSub[col] as string) : 0;
  });
  internet["fastpass"] = baseNonSub ? parseMoney(baseNonSub.fastpass) : 0;

  // Asurion: first Per Unit row
  const asurionPerUnit = asurionTotal.find((r) => r.type === "Per Unit");
  const asurionRate = asurionPerUnit ? parseMoney(asurionPerUnit.payout) : 0;

  // TV: first video entry
  const tvRate = parseMoney(video[0]?.payout ?? "0");

  return {
    lines:       baseMobile ? parseMoney(baseMobile.portedLines)  : 0,
    devices:     baseMobile ? parseMoney(baseMobile.deviceSales)  : 0,
    asurion:     asurionRate,
    tv:          tvRate,
    revenue:     0,
    Phone:       0,
    selfInstall: 0,
    internet,
  };
}

// ─── Firestore helpers ───────────────────────────────────────────────────────

/**
 * Load the full commission table from Firestore.
 * Returns empty object if document doesn't exist — buildFlatRates uses defaultTableData.
 */
export async function loadCommissionTable(
  uid: string
): Promise<Partial<CommissionTableData>> {
  try {
    const snap = await getDoc(doc(db, "users", uid, "settings", "commissionsTable"));
    if (snap.exists()) return snap.data() as Partial<CommissionTableData>;
  } catch (e) {
    console.error("loadCommissionTable:", e);
  }
  return {};
}

/** Load the user's selected tier from Firestore. Defaults to "tier1". */
export async function loadUserTier(uid: string): Promise<"tier1" | "tier2"> {
  try {
    const snap = await getDoc(doc(db, "users", uid, "settings", "commissionsTier"));
    if (snap.exists()) {
      const t = snap.data()?.tier;
      if (t === "tier1" || t === "tier2") return t;
    }
  } catch (e) {
    console.error("loadUserTier:", e);
  }
  return "tier1";
}

/** Persist the user's tier selection to Firestore. */
export async function saveUserTier(uid: string, tier: "tier1" | "tier2"): Promise<void> {
  try {
    await setDoc(
      doc(db, "users", uid, "settings", "commissionsTier"),
      { tier },
      { merge: true }
    );
  } catch (e) {
    console.error("saveUserTier:", e);
  }
}
