"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function usePaginatedApi<T>(endpoint: string, params?: Record<string, string | number>, options?: { pollingInterval?: number }) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const paramsKey = JSON.stringify(params ?? {});
  const stableParams = useMemo(() => params ?? {}, [paramsKey, params]);

  const fetchData = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    try {
      const res = await api.get<PaginatedResult<T>>(endpoint, {
        params: { page, limit: 10, search, ...stableParams },
      });
      setData(res.data.data);
      setTotalPages(res.data.totalPages);
    } catch {
      setData([]);
    } finally {
      if (!background) setLoading(false);
    }
  }, [endpoint, page, search, stableParams]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      try {
        const res = await api.get<PaginatedResult<T>>(endpoint, {
          params: { page, limit: 10, search, ...stableParams },
        });
        if (!active) return;
        setData(res.data.data);
        setTotalPages(res.data.totalPages);
      } catch {
        if (!active) return;
        setData([]);
      } finally {
        if (!active) return;
        setLoading(false);
      }
    };

    run();
    let interval: NodeJS.Timeout;
    if (options?.pollingInterval) {
      interval = setInterval(() => {
        if (active) fetchData(true);
      }, options.pollingInterval);
    }

    return () => {
      active = false;
      if (interval) clearInterval(interval);
    };
  }, [endpoint, page, search, stableParams, fetchData, options?.pollingInterval]);

  return { data, loading, page, setPage, totalPages, search, setSearch, refetch: fetchData };
}

export function useApiData<T>(endpoint: string, options?: { pollingInterval?: number }) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    try {
      const res = await api.get<{ data: T }>(endpoint);
      setData(res.data.data);
    } catch {
      setData(null);
    } finally {
      if (!background) setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      try {
        const res = await api.get<{ data: T }>(endpoint);
        if (!active) return;
        setData(res.data.data);
      } catch {
        if (!active) return;
        setData(null);
      } finally {
        if (!active) return;
        setLoading(false);
      }
    };

    run();
    let interval: NodeJS.Timeout;
    if (options?.pollingInterval) {
      interval = setInterval(() => {
        if (active) fetchData(true);
      }, options.pollingInterval);
    }

    return () => {
      active = false;
      if (interval) clearInterval(interval);
    };
  }, [endpoint, fetchData, options?.pollingInterval]);

  return { data, loading, refetch: fetchData };
}
