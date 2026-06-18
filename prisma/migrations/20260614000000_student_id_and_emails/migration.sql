-- Add university_student_id to Student
ALTER TABLE "Student" ADD COLUMN "university_student_id" VARCHAR(7);

CREATE UNIQUE INDEX "Student_university_student_id_key" ON "Student"("university_student_id");

-- Split login email from personal email on User
ALTER TABLE "User" ADD COLUMN "university_email" VARCHAR(100);

UPDATE "User" SET "university_email" = "personal_email" WHERE "university_email" IS NULL;

ALTER TABLE "User" ALTER COLUMN "university_email" SET NOT NULL;

CREATE UNIQUE INDEX "User_university_email_key" ON "User"("university_email");

ALTER TABLE "User" ALTER COLUMN "personal_email" DROP NOT NULL;

-- Password reset tokens
CREATE TABLE "PasswordResetToken" (
    "token_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("token_id")
);

CREATE UNIQUE INDEX "PasswordResetToken_token_hash_key" ON "PasswordResetToken"("token_hash");

ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
