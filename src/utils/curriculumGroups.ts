import type { EeluCourseRow, EeluSemesterBlock } from "./eeluBylawCurriculum.js";
import {
  buildCurriculumSlotLookup,
  getEeluCurriculumGroupedCourses,
  loadEeluBylawCurriculum,
} from "./eeluBylawCurriculum.js";

export type CurriculumGroup<T> = {
  key: string;
  level: string;
  term: string;
  label: string;
  sortOrder: number;
  yearLabel?: string;
  semesterLabel?: string;
  totalCreditHours?: number;
  items: T[];
};

const normalizeCode = (code: string): string =>
  code.trim().toUpperCase().replace(/\s+/g, "");

export const getGroupedCoursesForTrack = async (_majorType?: string | null) => {
  const curriculum = await getEeluCurriculumGroupedCourses();
  return curriculum.blocks.map((block) => ({
    key: block.key,
    level: block.yearLabel,
    term: block.semesterLabel,
    label: block.label,
    sortOrder: block.sortOrder,
    yearLabel: block.yearLabel,
    semesterLabel: block.semesterLabel,
    totalCreditHours: block.totalCreditHours,
    items: block.courses,
  }));
};

export const groupItemsByCurriculum = async <T>(
  items: T[],
  getCode: (item: T) => string,
  _majorType?: string | null
): Promise<CurriculumGroup<T>[]> => {
  const curriculum = await loadEeluBylawCurriculum();
  const slotLookup = buildCurriculumSlotLookup(curriculum);
  const groupsMap = new Map<string, CurriculumGroup<T>>();
  const other: T[] = [];

  for (const item of items) {
    const code = normalizeCode(getCode(item));
    const slot = slotLookup.get(code);
    if (!slot) {
      other.push(item);
      continue;
    }
    if (!groupsMap.has(slot.key)) {
      const block = curriculum.blocks.find((b) => b.key === slot.key);
      groupsMap.set(slot.key, {
        key: slot.key,
        level: block?.yearLabel ?? "",
        term: block?.semesterLabel ?? "",
        label: slot.label,
        sortOrder: slot.sortOrder,
        yearLabel: block?.yearLabel,
        semesterLabel: block?.semesterLabel,
        totalCreditHours: block?.totalCreditHours,
        items: [],
      });
    }
    groupsMap.get(slot.key)!.items.push(item);
  }

  const groups = [...groupsMap.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const g of groups) {
    g.items.sort((a, b) => getCode(a).localeCompare(getCode(b)));
  }

  if (other.length) {
    groups.push({
      key: "other",
      level: "Other",
      term: "",
      label: "Other / Unassigned",
      sortOrder: 9999,
      items: other.sort((a, b) => getCode(a).localeCompare(getCode(b))),
    });
  }

  return groups;
};

export type { EeluCourseRow, EeluSemesterBlock };
