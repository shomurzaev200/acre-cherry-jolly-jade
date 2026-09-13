import type { AccountStatus, NetworkStatus, TaskStatus } from "./types";

export const STATUS_RU: Record<AccountStatus, string> = {
  ACTIVE: "Активен",
  PAUSED: "Пауза",
  ERROR: "Ошибка",
};

export const TASK_RU: Record<TaskStatus, string> = {
  draft: "Черновик",
  pending_approval: "Ждёт approve",
  queued: "В очереди",
  publishing: "Публикация",
  published: "Опубликовано",
  failed: "Ошибка",
  awaiting_official_api: "Ждёт Meta API",
  retry: "Повтор",
};

export const NET_RU: Record<NetworkStatus, string> = {
  HEALTHY: "Стабилен",
  WARNING: "Внимание",
  OFFLINE: "Офлайн",
  DISABLED: "Отключён",
};

export const DAY_RU: Record<string, string> = {
  Sunday: "Воскресенье",
  Monday: "Понедельник",
  Tuesday: "Вторник",
  Wednesday: "Среда",
  Thursday: "Четверг",
  Friday: "Пятница",
  Saturday: "Суббота",
};

export const HOOK_OPTIONS = [
  "Question",
  "Unexpected fact",
  "Problem → Solution",
  "Long intro",
  "Generic",
] as const;

export const HOOK_RU: Record<string, string> = {
  Question: "Вопрос",
  "Unexpected fact": "Неожиданный факт",
  "Problem → Solution": "Проблема → решение",
  "Long intro": "Длинное интро",
  Generic: "Общий",
};

export function daysRu(days: string[]) {
  return days.map((d) => DAY_RU[d] ?? d).join(" · ");
}

export function modeRu(mode: string) {
  return mode === "AUTOPILOT" ? "Автопилот" : "Ручной AI";
}
