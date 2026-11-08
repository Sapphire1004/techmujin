import { z } from "zod";
import type { Booth, BoothList } from "techmujin-api";
import type { StampSpot } from "../stamp-rally/rally";

export const BOOTHS_API_URL =
  "https://techmujin-api.t-funabiki08.workers.dev/v1/events/techmujin-2026/booths";

const webUrl = z.url({ protocol: /^https?$/ });
const communitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: webUrl.nullable(),
  iconUrl: z.url({ protocol: /^https$/ }).nullable(),
  descriptionMarkdown: z.string().nullable(),
});

export const boothListSchema: z.ZodType<BoothList> = z.object({
  schemaVersion: z.literal(1),
  version: z.string().min(1),
  updatedAt: z.iso.datetime({ offset: true }),
  event: z.object({
    id: z.literal("techmujin-2026"),
    title: z.string().min(1),
    date: z.iso.date(),
    timezone: z.string().min(1),
    venue: z.string().nullable(),
    url: webUrl.nullable(),
  }),
  booths: z.array(z.object({
    number: z.string().min(1).refine((value) => value.trim().length > 0),
    title: z.string().nullable(),
    communities: z.array(communitySchema),
    descriptionMarkdown: z.string().nullable(),
  })),
}).superRefine(({ booths }, context) => {
  const numbers = new Set<string>();
  booths.forEach(({ number }, index) => {
    if (numbers.has(number)) {
      context.addIssue({
        code: "custom",
        path: ["booths", index, "number"],
        message: "ブース番号は一意である必要があります。",
      });
    }
    numbers.add(number);
  });
});

export function getBoothTitle(booth: Booth): string {
  return booth.title?.trim() ||
    booth.communities.map(({ name }) => name).join(" / ") ||
    `ブース ${booth.number}`;
}

export function createStampSpots(booths: readonly Booth[]): StampSpot[] {
  return booths.map((booth) => ({
    // 行の並べ替えで取得済みスタンプが別のブースに移らないよう、番号を使います。
    id: `spot-${booth.number}`,
    number: booth.number,
    title: getBoothTitle(booth),
    payload: `stamprally:v1:spot-${booth.number}`,
  }));
}

export async function fetchBooths(signal?: AbortSignal): Promise<BoothList> {
  const response = await fetch(BOOTHS_API_URL, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error(`ブースAPI: ${response.status}`);
  return boothListSchema.parse(await response.json());
}
