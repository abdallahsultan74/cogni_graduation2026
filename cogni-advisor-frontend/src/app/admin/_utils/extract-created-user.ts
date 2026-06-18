import type { CreatedUserCardData } from "../_components/user-card";

const getObject = (value: unknown) => {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
};

const getString = (value: unknown, fallback = "") => {
  return typeof value === "string" && value.trim() ? value : fallback;
};

export const extractCreatedUser = (
  response: unknown,
  fallbackRole: "Student" | "Advisor"
): CreatedUserCardData | null => {
  if (!response) {
    return null;
  }

  const root = getObject(response);
  const user = getObject(root.user);

  const firstName = getString(user.first_name ?? root.first_name);
  const lastName = getString(user.last_name ?? root.last_name);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  const roleRaw = getString(user.role ?? root.role, fallbackRole);
  const role = roleRaw.charAt(0).toUpperCase() + roleRaw.slice(1).toLowerCase();

  const email = getString(
    root.personal_email ?? user.personal_email ?? root.email ?? user.email
  );
  const userId = String(user.id ?? root.user_id ?? root.id ?? "N/A");

  if (!email) {
    return null;
  }

  return {
    userId,
    fullName: fullName || "N/A",
    role,
    email,
  };
};
