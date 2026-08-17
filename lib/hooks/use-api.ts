"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import api from "@/lib/api";

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function usePaginatedApi<T>(
  endpoint: string,
  params?: Record<string, string | number>,
  options?: { pollingInterval?: number }
) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const paramsKey = JSON.stringify(params ?? {});
  // eslint-disable-next-deps
  const stableParams = useMemo(() => params ?? {}, [paramsKey]);

  const queryKey = [endpoint, page, search, stableParams];

  const { data: result, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await api.get<PaginatedResult<T>>(endpoint, {
        params: { page, limit: 10, search, ...stableParams },
      });
      return res.data;
    },
    refetchInterval: options?.pollingInterval,
  });

  return {
    data: result?.data ?? [],
    loading: isLoading,
    page,
    setPage,
    totalPages: result?.totalPages ?? 1,
    search,
    setSearch,
    refetch: useCallback(() => refetch(), [refetch]),
  };
}

export function useApiData<T>(
  endpoint: string | null,
  options?: { pollingInterval?: number }
) {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: [endpoint],
    queryFn: async () => {
      if (!endpoint) return null;
      const res = await api.get<{ data: T }>(endpoint);
      return res.data.data;
    },
    enabled: !!endpoint,
    refetchInterval: options?.pollingInterval,
  });

  return {
    data: data ?? null,
    loading: isLoading,
    refetch: useCallback(() => refetch(), [refetch]),
  };
}
