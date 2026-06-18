import { z } from "zod";

export const createPlanSchema = z.object({
  body: z.object({
    semester_id: z.number({ error: "semester_id must be a number" }).int().positive()
  })
});

export const getCurrentPlanSchema = z.object({
  query: z.object({
    semesterId: z.string().regex(/^\d+$/, "semesterId must be a positive integer").optional()
  })
});

export const addCourseSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Plan ID must be a number")
  }),
  body: z.object({
    course_id: z.number()
  })
});

export const submitPlanSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Plan ID must be a number")
  })
});

export const updatePlanCoursesSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Plan ID must be a number"),
  }),
  body: z.object({
    course_ids: z.array(z.number().int().positive()),
  }),
});

export const removeCourseSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Plan ID must be a number"),
    courseId: z.string().regex(/^\d+$/, "Course ID must be a number"),
  }),
});

export const planIdParamsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Plan ID must be a number"),
  }),
});

export const availableCoursesSchema = z.object({
  query: z.object({
    planId: z.string().regex(/^\d+$/, "planId must be a number").optional(),
  }),
});

export const reviewPlanSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Plan ID must be a number"),
  }),
  body: z.object({
    status: z.enum(["APPROVED", "REJECTED"]),
    feedback: z.string().optional(),
  }),
});
