import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { getGroupedCoursesForTrack } from "../utils/curriculumGroups.js";

export const createCourse = async (data: any) => {
  const {
    course_code,
    course_name,
    credits,
    required_hours_to_take,
    is_available
  } = data;

  if (!course_code || !course_name || !credits) {
    throw new AppError("Missing required fields", 400);
  }

  return prisma.course.create({
    data: {
      course_code,
      course_name,
      credits,
      required_hours_to_take,
      is_available: is_available ?? true
    }
  });
};


export const getAllCourses = async () => {
  return prisma.course.findMany();
};

export const getCoursesGroupedByCurriculum = async (majorType?: string | null) => {
  return getGroupedCoursesForTrack(majorType);
};

export const getCourseById = async (id: number) => {
  const course = await prisma.course.findUnique({
    where: { course_id: id },
  });

  if (!course) {
    throw new AppError("Course not found", 404);
  }

  return course;
};

const UPDATE_COURSE_FIELDS = [
  "course_code",
  "course_name",
  "credits",
  "required_hours_to_take",
  "is_available"
] as const;

export const updateCourse = async (
  id: number,
  data: {
    course_code?: string;
    course_name?: string;
    credits?: number;
    required_hours_to_take?: number | null;
    is_available?: boolean;
  }
) => {
  const course = await prisma.course.findUnique({
    where: { course_id: id },
  });

  if (!course) {
    throw new AppError("Course not found", 404);
  }

  const safeData: Record<string, unknown> = {};
  for (const key of UPDATE_COURSE_FIELDS) {
    if (data[key as keyof typeof data] !== undefined) {
      safeData[key] = data[key as keyof typeof data];
    }
  }

  return prisma.course.update({
    where: { course_id: id },
    data: safeData,
  });
};

export const deleteCourse = async (id: number) => {
  const course = await prisma.course.findUnique({
    where: { course_id: id },
  });

  if (!course) {
    throw new AppError("Course not found", 404);
  }

  await prisma.coursePrerequisite.deleteMany({
    where: {
      OR: [
        { course_id: id },
        { prereq_course_id: id }
      ]
    }
  });

  return prisma.course.delete({
    where: { course_id: id },
  });
};


export const toggleCourseAvailability = async (
  id: number
) => {
  const course = await prisma.course.findUnique({
    where: { course_id: id },
  });

  if (!course) {
    throw new AppError("Course not found", 404);
  }

  return prisma.course.update({
    where: { course_id: id },
    data: {
      is_available: !course.is_available,
    },
  });
};

export const addPrerequisite = async (
  courseId: number,
  prerequisiteId: number
) => {
  if (courseId === prerequisiteId) {
    throw new AppError("Course cannot depend on itself", 400);
  }

  const existing = await prisma.coursePrerequisite.findFirst({
    where: {
      course_id: courseId,
      prereq_course_id: prerequisiteId,
    },
  });

  if (existing) {
    throw new AppError("Prerequisite already exists", 400);
  }

  return prisma.coursePrerequisite.create({
    data: {
      course_id: courseId,
      prereq_course_id: prerequisiteId,
    },
  });
};

export const getCourseWithPrerequisites = async (
  courseId: number
) => {
  return prisma.course.findUnique({
    where: { course_id: courseId },
    include: {
      prerequisites: {
        include: {
          prereq: true,
        },
      },
    },
  });
};

export const removePrerequisite = async (
  courseId: number,
  prerequisiteId: number
) => {
  const existing = await prisma.coursePrerequisite.findFirst({
    where: {
      course_id: courseId,
      prereq_course_id: prerequisiteId,
    },
  });

  if (!existing) {
    throw new AppError("Prerequisite relationship not found", 404);
  }

  return prisma.coursePrerequisite.delete({
    where: {
      course_id_prereq_course_id: {
        course_id: courseId,
        prereq_course_id: prerequisiteId,
      },
    },
  });
};


