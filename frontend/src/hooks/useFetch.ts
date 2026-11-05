import { useCallback, useEffect, useState } from "react";

export function useFetch<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(() => {
    setLoading(true);
    setError(undefined);
    fn()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, deps);

  useEffect(reload, [reload]);
  return { data, error, loading, reload };
}
