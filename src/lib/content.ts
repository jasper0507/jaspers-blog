interface DraftableEntry {
  data: { draft: boolean };
}

export const isPublished = (entry: DraftableEntry) => !entry.data.draft;
