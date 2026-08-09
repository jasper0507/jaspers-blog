interface DraftableEntry {
  data: { draft: boolean };
}

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const isPublished = (entry: DraftableEntry) => !entry.data.draft;

export function projectContentDate(date: Date) {
  const value = dateFormatter.format(date);
  return { date: value, compact: value.replaceAll("-", ".") };
}
