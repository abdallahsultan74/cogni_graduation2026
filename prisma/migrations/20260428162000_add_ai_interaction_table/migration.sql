DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AIQueryType') THEN
    CREATE TYPE "AIQueryType" AS ENUM ('CHAT', 'SUGGEST_PLAN', 'PREDICT_GPA', 'RISK_ANALYSIS');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AIStatus') THEN
    CREATE TYPE "AIStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "AIInteraction" (
  "interaction_id" SERIAL NOT NULL,
  "student_id" INTEGER NOT NULL,
  "query_type" "AIQueryType" NOT NULL,
  "input_data" JSONB NOT NULL,
  "response_data" JSONB,
  "status" "AIStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIInteraction_pkey" PRIMARY KEY ("interaction_id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AIInteraction_student_id_fkey'
  ) THEN
    ALTER TABLE "AIInteraction"
    ADD CONSTRAINT "AIInteraction_student_id_fkey"
    FOREIGN KEY ("student_id")
    REFERENCES "Student"("student_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
  END IF;
END
$$;
