import type { Request, Response } from "express";
import * as courseService from "../services/course.service.js";

export const createCourseHandler = async (req: Request,res: Response) => {
    const course = await courseService.createCourse(req.body);
    res.status(201).json(course);
  };

export const getCoursesHandler = async (
  req: Request,
  res: Response
) => {

    const courses = await courseService.getAllCourses();
    res.json(courses);
};

export const getCoursesGroupedHandler = async (
  req: Request,
  res: Response
) => {
  const groups = await courseService.getCoursesGroupedByCurriculum();
  res.json({ groups, source: "eelulaw.pdf" });
};

export const getCourseByIdHandler = async (
  req: Request,
  res: Response
) => {
    const id = Number(req.params.id);
    const course = await courseService.getCourseById(id);

    res.json(course);
};

export const updateCourseHandler = async (
  req: Request,
  res: Response
) => {
    const id = Number(req.params.id);
    const body = req.body as Record<string, unknown>;
    // Map common aliases to schema fields (name -> course_name)
    const data = {
      ...body,
      course_name: body.course_name ?? body.name
    };
    delete (data as Record<string, unknown>).name;
    delete (data as Record<string, unknown>).description;

    const updated =
      await courseService.updateCourse(id, data as Parameters<typeof courseService.updateCourse>[1]);

    res.json(updated);
};

export const deleteCourseHandler = async (
  req: Request,
  res: Response
) => {
    const id = Number(req.params.id);

    await courseService.deleteCourse(id);

    res.json({ message: "Course deleted successfully" });
};

export const toggleAvailabilityHandler = async (
  req: Request,
  res: Response
) => {
    const id = Number(req.params.id);

    const updated =
      await courseService.toggleCourseAvailability(id);

    res.json(updated);
};

export const addPrerequisiteHandler = async (
  req: Request,
  res: Response
) => {
    const { courseId, prerequisiteId } = req.body;

    const result =
      await courseService.addPrerequisite(
        courseId,
        prerequisiteId
      );

    res.status(201).json(result);
};

export const getCourseDetailsHandler = async (
  req: Request,
  res: Response
) => {
    const id = Number(req.params.id);

    const course =
      await courseService.getCourseWithPrerequisites(id);

    res.json(course);
};

export const removePrerequisiteHandler = async (
  req: Request,
  res: Response
) => {
    const { courseId, prerequisiteId } = req.body;

    await courseService.removePrerequisite(
      courseId,
      prerequisiteId
    );

    res.json({ message: "Prerequisite removed successfully" });
};

