type SimulationCatalogItem = {
  slug: string;
};

function editionFromSlug(slug: string) {
  const match = slug.match(/^(?:diagnostico|exame)-(\d+)$/);
  return match ? Number(match[1]) : null;
}

export function orderSimulationsByNewestEdition<
  T extends SimulationCatalogItem,
>(items: T[]) {
  return items
    .map((item, index) => ({
      edition: editionFromSlug(item.slug),
      index,
      item,
    }))
    .sort((left, right) => {
      if (left.edition === null && right.edition === null) {
        return left.index - right.index;
      }
      if (left.edition === null) return 1;
      if (right.edition === null) return -1;
      return right.edition - left.edition || left.index - right.index;
    })
    .map(({ item }) => item);
}
