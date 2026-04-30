/**
 * Contract types for the Hugging Face Space endpoint:
 * POST `/recommendation/api/recommend`
 *
 * Implemented against:
 * `cogni-advisor-ai/GP/recommendation/routes.py` -> `api_recommend()`
 */

export type CogniAdvisorDepartmentName = "IT" | "AI" | "null";
export type CogniAdvisorCourseType = "Mandatory" | "Elective";
export type CogniAdvisorTerm = "First" | "Second" | "Summer";
export type CogniAdvisorSemester = "regular" | "summer";

export type CogniAdvisorCompletedCourse = {
  code: string;
  course_name: string;
  credit_hours: number;
  distribution_category: string;
  type: CogniAdvisorCourseType;
  prerequisites: string[];
  Term: CogniAdvisorTerm[];
  department: CogniAdvisorDepartmentName;
  level?: string;
};

export type CogniAdvisorRecommendPayload = {
  StudentId: string;
  GPA: number;
  expected_to_graduate?: boolean;
  semester?: CogniAdvisorSemester;
  Term?: CogniAdvisorTerm;
  DepartmentName: CogniAdvisorDepartmentName;
  CompletedCourses: CogniAdvisorCompletedCourse[];
};

export type CogniAdvisorCourseSummary = {
  code: string;
  course_name: string;
  credit_hours: number;
  distribution_category: string;
  type: CogniAdvisorCourseType;
  level?: string;
};

export type CogniAdvisorRecommendResult = {
  core_courses: CogniAdvisorCourseSummary[];
  core_course_codes: string[];
  electives: {
    GeneralOptions?: CogniAdvisorCourseSummary[];
    AppliedOptions?: CogniAdvisorCourseSummary[];
    General?: number;
    Applied?: number;
    TotalElectives?: number;
    UsedElectiveCredits?: number;
  };
  coming_next_term?: {
    term: string;
    courses: CogniAdvisorCourseSummary[];
  };
  student_summary?: Record<string, unknown>;
};

