// sync/src/advertiserMaster.ts
// 광고주 마스터(정기회의시트 캠페인탭 N·O열 스냅샷) 로드 + 광고주명 정규화·해석.
// 순수 로직 (파일 로드는 loadMaster 로 분리) — 테스트 가능.
import * as fs from "node:fs";
import type { DerivedFields } from "./types.js";

export interface MasterEntry {
  client: string;
  aliases: string[];
  business_name: string | null;
  industry: string | null;
  advertiser_type: string | null;
  status: "confirmed" | "proposed" | "unknown";
  reason?: string;
}

export interface AdvertiserMaster {
  updated_at: string;
  category_groups: Record<string, string[]>;
  advertisers: MasterEntry[];
}

export function loadMaster(path = "data/advertiser-master.json"): AdvertiserMaster {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

/** 광고주 원문 표기 정규화: '(비딩)'·'비딩' 접미사 제거 → is_bidding 분리, 공백·대소문자 통일 키. */
export function normClient(raw: string): { key: string; cleaned: string; isBidding: boolean } {
  let x = raw.trim();
  const isBidding = /\(비딩\)/.test(x) || /(^|\s)비딩\s*$/.test(x);
  x = x.replace(/\(비딩\)/g, "").replace(/\s*비딩\s*$/, "").trim();
  return { key: x.replace(/\s+/g, "").toLowerCase(), cleaned: x, isBidding };
}

export interface Resolver {
  resolve(raw: string): DerivedFields;
}

export function buildResolver(master: AdvertiserMaster): Resolver {
  const lookup = new Map<string, MasterEntry>();
  for (const a of master.advertisers) {
    lookup.set(normClient(a.client).key, a);
    for (const al of a.aliases) lookup.set(normClient(al).key, a);
  }
  const groupOf = new Map<string, string>();
  for (const [group, industries] of Object.entries(master.category_groups))
    for (const ind of industries) groupOf.set(ind, group);

  return {
    resolve(raw: string): DerivedFields {
      const { key, cleaned, isBidding } = normClient(raw);
      const entry = lookup.get(key);
      if (!entry) {
        return {
          client: cleaned || raw.trim(),
          client_raw: raw.trim(),
          client_matched: false,
          industry: null,
          category_group: null,
          advertiser_type: null,
          advertiser_status: "unmatched",
          is_bidding: isBidding,
        };
      }
      return {
        client: entry.client,
        client_raw: raw.trim(),
        client_matched: true,
        industry: entry.industry,
        category_group: entry.industry ? (groupOf.get(entry.industry) ?? null) : null,
        advertiser_type: entry.advertiser_type,
        advertiser_status: entry.status,
        is_bidding: isBidding,
      };
    },
  };
}
