"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function usePaginatedApi<T>(endpoint: string, params: Record<string, string | number> = {}) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResult<T>>(endpoint, {
        params: { page, limit: 10, search, ...params },
      });
      setData(res.data.data);
      setTotalPages(res.data.totalPages);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, search, params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, page, setPage, totalPages, search, setSearch, refetch: fetchData };
}

export function useApiData<T>(endpoint: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: T }>(endpoint);
      setData(res.data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, refetch: fetchData };
}
