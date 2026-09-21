// Follow every page, including when the API caps a response below the requested size.
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<{ data: T[]; error: null }> {
  const data: T[] = [];
  const pageSize = 1000;
  while (true) {
    const page = await fetchPage(data.length, data.length + pageSize - 1);
    if (page.error) throw page.error;
    if (!page.data?.length) return { data, error: null };
    data.push(...page.data);
  }
}
