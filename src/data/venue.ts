import { z } from "zod";
import venueMapJson from "./venue-map.json";

const percentageSchema = z.number().min(0).max(100);

const venueZoneSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  location: z.string().min(1),
  description: z.string().min(1),
  tone: z.enum(["stage", "booth", "communication"]),
  x: percentageSchema,
  y: percentageSchema,
  width: percentageSchema.positive(),
  height: percentageSchema.positive(),
});

const boothSchema = z.object({
  id: z.string().min(1),
  number: z.string().min(1).nullable(),
  name: z.string().min(1),
  exhibitor: z.string().min(1),
  description: z.string().min(1),
  zoneId: z.string().min(1),
  url: z.url(),
});

const venueGuideSchema = z
  .object({
    venue: z.object({
      name: z.string().min(1),
      address: z.string().min(1),
      mapUrl: z.url(),
    }),
    openHours: z.string().min(1),
    layoutStatus: z.literal("zone-overview"),
    zones: z.array(venueZoneSchema).min(1),
    booths: z.array(boothSchema),
  })
  .superRefine(({ zones, booths }, context) => {
    const zoneIds = new Set(zones.map(({ id }) => id));

    zones.forEach((zone, index) => {
      if (zone.x + zone.width > 100 || zone.y + zone.height > 100) {
        context.addIssue({
          code: "custom",
          message: `Zone exceeds map bounds: ${zone.id}`,
          path: ["zones", index],
        });
      }
    });

    booths.forEach((booth, index) => {
      if (!zoneIds.has(booth.zoneId)) {
        context.addIssue({
          code: "custom",
          message: `Unknown zoneId: ${booth.zoneId}`,
          path: ["booths", index, "zoneId"],
        });
      }
    });
  });

export type VenueGuideData = z.infer<typeof venueGuideSchema>;
export type VenueZone = VenueGuideData["zones"][number];
export type VenueBooth = VenueGuideData["booths"][number];

export const venueGuideResult = venueGuideSchema.safeParse(venueMapJson);
