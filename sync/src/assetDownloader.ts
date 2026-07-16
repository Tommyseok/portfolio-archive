// sync/src/assetDownloader.ts
// 슬라이드 안 크리에이티브 이미지(contentUrl, 30분 만료)를 즉시 내려받아
// 800px webp 로 리사이즈 저장. 파일명은 요소 objectId 기반이라 재실행 시 캐시 재사용.
import * as fs from "node:fs";
import * as path from "node:path";
import sharp from "sharp";
import type { SlideImage } from "./parseDeck.js";

const OUT_DIR = "data/assets";
const MAX_W = 800;
const CONCURRENCY = 5;

function safeName(prefix: string, slideId: string, elementId: string): string {
  const clean = (s: string) => s.replace(/[^A-Za-z0-9_-]+/g, "");
  return `${prefix}${clean(slideId)}-${clean(elementId)}.webp`;
}

async function downloadOne(prefix: string, slideId: string, img: SlideImage): Promise<string | null> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const rel = `assets/${safeName(prefix, slideId, img.element_id)}`;
  const filePath = path.join("data", rel);
  if (fs.existsSync(filePath)) return rel; // 캐시
  try {
    const res = await fetch(img.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await sharp(buf).resize({ width: MAX_W, withoutEnlargement: true }).webp({ quality: 78 }).toFile(filePath);
    return rel;
  } catch (e) {
    console.warn(`⚠ 에셋 실패 ${rel}: ${String((e as Error)?.message).slice(0, 80)}`);
    return null;
  }
}

/** 슬라이드의 이미지들을 병렬(5) 다운로드, 성공한 상대경로 목록 반환 (요소 순서 유지) */
export async function downloadSlideAssets(prefix: string, slideId: string, images: SlideImage[]): Promise<string[]> {
  const out: (string | null)[] = new Array(images.length).fill(null);
  for (let s = 0; s < images.length; s += CONCURRENCY) {
    const chunk = images.slice(s, s + CONCURRENCY);
    const results = await Promise.all(chunk.map((img) => downloadOne(prefix, slideId, img)));
    results.forEach((r, i) => { out[s + i] = r; });
  }
  return out.filter((r): r is string => !!r);
}
