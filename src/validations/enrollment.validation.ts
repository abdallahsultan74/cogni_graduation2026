import { z } from "zod";



const gradeEnum = z.enum([

  "A+", "A", "A-",

  "B+", "B", "B-",

  "C+", "C", "C-",

  "D+", "D", "D-",

  "F",

]);



const semesterResolutionFields = {

  semester_id: z.coerce.number().int().positive().optional(),

  semester_name: z.string().trim().min(1).max(50).optional(),

  result_date: z.string().trim().min(1).optional(),

};



const hasSemesterInput = (data: {

  semester_id?: number;

  semester_name?: string;

  result_date?: string;

}) => Boolean(data.semester_id || data.semester_name || data.result_date);



export const enrollSchema = z.object({

  body: z.object({

    course_id: z.coerce.number().int().positive("course_id must be a positive number"),

  }),

});



export const markPassedSchema = z.object({

  body: z

    .object({

      student_id: z.coerce.number().int().positive("student_id must be a positive number"),

      course_id: z.coerce.number().int().positive("course_id must be a positive number"),

      grade: gradeEnum,

      ...semesterResolutionFields,

    })

    .refine(

      (data) => {

        const keys = [data.semester_id, data.semester_name, data.result_date].filter(Boolean);

        return keys.length <= 1;

      },

      { message: "Provide only one of semester_id, semester_name, or result_date" }

    ),

});



export const bulkGradesSchema = z.object({

  body: z

    .object({

      ...semesterResolutionFields,

      grades: z

        .array(

          z.object({

            student_email: z.string().email(),

            course_code: z.string().min(2),

            grade: gradeEnum,

          })

        )

        .min(1),

    })

    .refine(hasSemesterInput, {

      message: "Provide semester_id, semester_name, or result_date",

    })

    .refine(

      (data) => {

        const keys = [data.semester_id, data.semester_name, data.result_date].filter(Boolean);

        return keys.length === 1;

      },

      { message: "Provide exactly one of semester_id, semester_name, or result_date" }

    ),

});



export const resolveSemesterSchema = z.object({

  query: z

    .object({

      semester_name: z.string().trim().min(1).max(50).optional(),

      result_date: z.string().trim().min(1).optional(),

    })

    .refine(

      (data) => Boolean(data.semester_name || data.result_date),

      { message: "Provide semester_name or result_date" }

    )

    .refine(

      (data) => Boolean(data.semester_name) !== Boolean(data.result_date),

      { message: "Provide only one of semester_name or result_date" }

    ),

});


