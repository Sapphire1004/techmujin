import { z } from "zod";
import venueMapJson from "./venue-map.json";

const percentageSchema = z.number().min(0).max(100);

const rectangleSchema = z.object({
  x: percentageSchema,
  y: percentageSchema,
  width: percentageSchema.positive(),
  height: percentageSchema.positive(),
});

const venueFeatureSchema = rectangleSchema.extend({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  kind: z.enum(["booth", "area", "facility", "marker", "label", "entrance"]),
  tone: z.enum(["brand", "accent", "secondary", "neutral", "muted"]),
  boothNumber: z.string().min(1).nullable(),
});

const venuePlanSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().min(1),
  aspectRatio: z.number().positive(),
  boundary: rectangleSchema,
  orientation: z.object({
    top: z.string().min(1).nullable(),
    bottom: z.string().min(1).nullable(),
    left: z.string().min(1).nullable(),
    right: z.string().min(1).nullable(),
  }),
  features: z.array(venueFeatureSchema),
});

const boothSchema = z.object({
  id: z.string().min(1),
  number: z.string().min(1).nullable(),
  name: z.string().min(1),
  exhibitor: z.string().min(1),
  description: z.string().min(1),
  planId: z.string().min(1),
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
    layoutStatus: z.literal("reference-layout"),
    plans: z.array(venuePlanSchema).min(1),
    booths: z.array(boothSchema),
  })
  .superRefine(({ plans, booths }, context) => {
    const planIds = new Set<string>();
    const boothSlotsByPlan = new Map<string, Set<string>>();

    plans.forEach((plan, planIndex) => {
      if (planIds.has(plan.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate plan id: ${plan.id}`,
          path: ["plans", planIndex, "id"],
        });
      }
      planIds.add(plan.id);

      if (
        plan.boundary.x + plan.boundary.width > 100 ||
        plan.boundary.y + plan.boundary.height > 100
      ) {
        context.addIssue({
          code: "custom",
          message: `Plan boundary exceeds map bounds: ${plan.id}`,
          path: ["plans", planIndex, "boundary"],
        });
      }

      const featureIds = new Set<string>();
      const boothSlots = new Set<string>();

      plan.features.forEach((feature, featureIndex) => {
        if (featureIds.has(feature.id)) {
          context.addIssue({
            code: "custom",
            message: `Duplicate feature id: ${feature.id}`,
            path: ["plans", planIndex, "features", featureIndex, "id"],
          });
        }
        featureIds.add(feature.id);

        if (feature.x + feature.width > 100 || feature.y + feature.height > 100) {
          context.addIssue({
            code: "custom",
            message: `Feature exceeds map bounds: ${feature.id}`,
            path: ["plans", planIndex, "features", featureIndex],
          });
        }

        if (feature.kind === "booth" && feature.boothNumber === null) {
          context.addIssue({
            code: "custom",
            message: `Booth feature requires boothNumber: ${feature.id}`,
            path: ["plans", planIndex, "features", featureIndex, "boothNumber"],
          });
        }

        if (feature.kind !== "booth" && feature.boothNumber !== null) {
          context.addIssue({
            code: "custom",
            message: `Only booth features may have boothNumber: ${feature.id}`,
            path: ["plans", planIndex, "features", featureIndex, "boothNumber"],
          });
        }

        if (feature.boothNumber) {
          if (boothSlots.has(feature.boothNumber)) {
            context.addIssue({
              code: "custom",
              message: `Duplicate booth number: ${feature.boothNumber}`,
              path: ["plans", planIndex, "features", featureIndex, "boothNumber"],
            });
          }
          boothSlots.add(feature.boothNumber);
        }
      });

      boothSlotsByPlan.set(plan.id, boothSlots);
    });

    booths.forEach((booth, boothIndex) => {
      if (!planIds.has(booth.planId)) {
        context.addIssue({
          code: "custom",
          message: `Unknown planId: ${booth.planId}`,
          path: ["booths", boothIndex, "planId"],
        });
      }

      if (
        booth.number &&
        !boothSlotsByPlan.get(booth.planId)?.has(booth.number)
      ) {
        context.addIssue({
          code: "custom",
          message: `Unknown booth number in plan: ${booth.number}`,
          path: ["booths", boothIndex, "number"],
        });
      }
    });
  });

export type VenueGuideData = z.infer<typeof venueGuideSchema>;
export type VenuePlan = VenueGuideData["plans"][number];
export type VenueFeature = VenuePlan["features"][number];
export type VenueBooth = VenueGuideData["booths"][number];

export const venueGuideResult = venueGuideSchema.safeParse(venueMapJson);
