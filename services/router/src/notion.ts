export type CreatePageInput = {
  database_id: string;
  title: string;
  status?: string;
  titleProperty?: string; // default: "Project Name"
  statusProperty?: string; // default: "Project Status"
};

export function toCreatePageArgs(input: CreatePageInput) {
  const titleKey = input.titleProperty ?? "Project Name";
  const statusKey = input.statusProperty ?? "Project Status";
  const props: Record<string, unknown> = {
    [titleKey]: { title: [{ text: { content: input.title } }] },
  };
  if (input.status) props[statusKey] = { select: { name: input.status } };
  return { parent: { database_id: input.database_id }, properties: props };
}
