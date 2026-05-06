export async function fetchAllPaginated(apiMethod, params = {}) {
  let page = 1;
  let all = [];
  let hasNext = true;

  while (hasNext) {
    const { data } = await apiMethod({ ...params, page });

    if (Array.isArray(data)) {
      all = [...all, ...data];
      hasNext = false;
      continue;
    }

    const results = data?.results || [];
    all = [...all, ...results];
    hasNext = Boolean(data?.next);
    page += 1;
  }

  return all;
}
