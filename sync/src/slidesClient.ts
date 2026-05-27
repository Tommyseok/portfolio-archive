// sync/src/slidesClient.ts
// Google Slides + Drive 인증(I/O) 및 presentation fetch.
// 표준 Google Node 퀵스타트 형태(loadSavedCredentialsIfExist / saveCredentials / authorize)를
// @google-cloud/local-auth 의 설치형 앱 loopback 플로우로 구현한다 (oob 폐기 대응).
import * as fs from "node:fs";
import * as path from "node:path";
import { google } from "googleapis";
import { authenticate } from "@google-cloud/local-auth";
import type { OAuth2Client } from "google-auth-library";
import type { JSONClient } from "google-auth-library/build/src/auth/googleauth.js";

const SCOPES = [
  "https://www.googleapis.com/auth/presentations.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
];

// 사용자가 Google Cloud Console에서 받은 OAuth 클라이언트(데스크톱 앱) JSON.
const CREDENTIALS_PATH = "credentials.json";
// 최초 인증 후 refresh token 캐시 위치.
const TOKEN_PATH = "token.json";

/**
 * token.json 이 있으면 저장된 자격증명을 로드한다. 없으면 null.
 */
function loadSavedCredentialsIfExist(): JSONClient | null {
  if (!fs.existsSync(TOKEN_PATH)) return null;
  const content = fs.readFileSync(TOKEN_PATH, "utf8");
  const credentials = JSON.parse(content);
  return google.auth.fromJSON(credentials) as JSONClient;
}

/**
 * 인증 클라이언트의 refresh token 을 credentials.json 의 client_id/secret 과 함께
 * token.json 으로 직렬화해 저장한다.
 */
function saveCredentials(client: OAuth2Client): void {
  const content = fs.readFileSync(CREDENTIALS_PATH, "utf8");
  const keys = JSON.parse(content);
  const key = keys.installed ?? keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  fs.writeFileSync(TOKEN_PATH, payload);
}

/**
 * 인증 클라이언트를 반환한다.
 * - token.json 이 있으면 그대로 사용.
 * - 없으면 local-auth 의 loopback 플로우로 브라우저 인증 후 refresh token 을 캐시.
 */
async function getAuth(): Promise<JSONClient | OAuth2Client> {
  const saved = loadSavedCredentialsIfExist();
  if (saved) return saved;

  const client = await authenticate({
    scopes: SCOPES,
    keyfilePath: path.resolve(CREDENTIALS_PATH),
  });
  if (client.credentials.refresh_token) {
    saveCredentials(client);
  }
  return client;
}

/**
 * presentation 전체(Schema$Presentation)를 가져온다.
 */
export async function fetchPresentation(presentationId: string) {
  const auth = await getAuth();
  // googleapis 의 auth 옵션은 다양한 클라이언트 타입을 허용한다.
  const slides = google.slides({ version: "v1", auth: auth as OAuth2Client });
  const res = await slides.presentations.get({ presentationId });
  return res.data; // Schema$Presentation
}

/**
 * 주어진 슬라이드를 PNG 로 렌더링해 로컬에 저장하고, data/ 기준 상대 경로를 반환한다.
 * - 반환 경로: thumbnails/<slideObjectId>.png (카탈로그 항목이 저장하고 웹앱이 서빙할 값)
 * - 실제 파일: <outDir>/<slideObjectId>.png (기본 data/thumbnails/<id>.png)
 */
/**
 * Google Slides API 분당 "Expensive read requests" 한도 준수를 위한 딜레이.
 * 기본 2.5초 → 분당 최대 24회 (한도 30회의 80% 수준으로 안전하게 유지).
 */
const THUMB_DELAY_MS = Number(process.env.THUMB_DELAY_MS ?? 2500);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function downloadThumbnail(
  presentationId: string,
  slideObjectId: string,
  outDir = "data/thumbnails",
): Promise<string> {
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, `${slideObjectId}.png`);
  const rel = `thumbnails/${slideObjectId}.png`;

  // 이미 다운로드된 썸네일은 API 재호출 없이 캐시에서 반환
  if (fs.existsSync(filePath)) return rel;

  // API 호출 전 딜레이 (분당 할당량 초과 방지)
  await sleep(THUMB_DELAY_MS);

  const auth = await getAuth();
  const slides = google.slides({ version: "v1", auth: auth as OAuth2Client });
  const thumb = await slides.presentations.pages.getThumbnail({
    presentationId,
    pageObjectId: slideObjectId,
    "thumbnailProperties.mimeType": "PNG",
    "thumbnailProperties.thumbnailSize": "MEDIUM",
  });
  const url = thumb.data.contentUrl!;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`thumbnail fetch failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filePath, buf);
  return rel;
}
