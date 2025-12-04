export const FREE_PLAN_LIMITS = {
  documents: 3,
  storage: 50 * 1024 * 1024, // 50 MB
  ai: 0,
};

export const PRO_PLAN_LIMITS = {
  documents: Infinity,
  storage: 1 * 1024 * 1024 * 1024, // 1 GB
  ai: 50,
};
