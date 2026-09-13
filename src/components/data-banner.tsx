import { Info } from "lucide-react";

export function DataBanner() {
  return (
    <div className="flex gap-3 rounded-[var(--radius-md)] border border-line bg-bg-subtle px-3 py-2.5 text-xs leading-relaxed text-fg-muted">
      <Info className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
      <p>
        Цифры ниже — <span className="text-fg">демо-набор для обучения AI-контура</span>, не живые
        метрики Instagram. Пока Meta Graph API не подключён, официальные показатели отображаются как
        N/A. Накрутка, боты и обход ограничений платформы не поддерживаются.
      </p>
    </div>
  );
}
