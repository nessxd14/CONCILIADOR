type PageResult<T> = { data: T[] | null; error: { message: string } | null };
/** PostgREST limita cada respuesta. Nunca usar una sola página como total de cartera. */
export async function leerPaginas<T>(fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await fetchPage(offset, offset + 999);
    if (page.error) return { data: null, error: page.error };
    rows.push(...(page.data ?? []));
    if ((page.data?.length ?? 0) < 1000) return { data: rows, error: null };
  }
}
