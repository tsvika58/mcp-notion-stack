export function toCreatePageArgs(input) {
    const titleKey = input.titleProperty ?? "Project Name";
    const statusKey = input.statusProperty ?? "Project Status";
    const props = {
        [titleKey]: { title: [{ text: { content: input.title } }] },
    };
    if (input.status)
        props[statusKey] = { select: { name: input.status } };
    return { parent: { database_id: input.database_id }, properties: props };
}
