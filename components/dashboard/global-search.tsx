"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Package, ShoppingCart, Users, X, Loader2, Command } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import api from "@/lib/api";

interface SearchResults {
  products: { id: string; name: string; sku: string; stockQuantity: number; status: string; image: string | null; category: { name: string } }[];
  sales: { id: string; invoiceNumber: string; status: string; totalAmount: string; createdAt: string; customer: { name: string } | null }[];
  customers: { id: string; name: string; email: string | null; phone: string | null; status: string }[];
  total: number;
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults(null);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(q)}`);
      setResults(res.data.data);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  }

  function navigate(path: string) {
    router.push(path);
    setOpen(false);
  }

  const hasResults = results && results.total > 0;

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        id="global-search-trigger"
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground rounded-lg border bg-muted/50 hover:bg-muted transition-colors w-48 lg:w-64"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Search...</span>
        <div className="flex items-center gap-0.5 text-xs opacity-60">
          <Command className="h-3 w-3" />
          <span>K</span>
        </div>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative z-10 w-full max-w-xl bg-card rounded-2xl shadow-2xl border overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              {loading
                ? <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0" />
                : <Search className="h-4 w-4 text-muted-foreground shrink-0" />}
              <input
                ref={inputRef}
                type="text"
                placeholder="Search products, sales, customers..."
                value={query}
                onChange={handleQueryChange}
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
              {query && (
                <button onClick={() => { setQuery(""); setResults(null); }}>
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {!query && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Type to search across Products, Sales &amp; Customers</p>
                </div>
              )}

              {query.length > 0 && query.length < 2 && (
                <div className="px-4 py-4 text-center text-sm text-muted-foreground">Type at least 2 characters…</div>
              )}

              {!loading && results && !hasResults && query.length >= 2 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No results found for &quot;<strong>{query}</strong>&quot;
                </div>
              )}

              {hasResults && (
                <div className="py-2">
                  {/* Products */}
                  {results.products.length > 0 && (
                    <div>
                      <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Package className="h-3 w-3" /> Products ({results.products.length})
                      </div>
                      {results.products.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => navigate(`/dashboard/products`)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 text-left transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                            {p.image
                              ? <img src={p.image} alt="" className="w-full h-full object-cover" />
                              : <Package className="h-4 w-4 text-muted-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.sku} · {p.category.name} · {p.stockQuantity} in stock</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${p.stockQuantity <= 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                            {p.stockQuantity <= 0 ? "Out" : "In Stock"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Sales */}
                  {results.sales.length > 0 && (
                    <div>
                      <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mt-1">
                        <ShoppingCart className="h-3 w-3" /> Sales ({results.sales.length})
                      </div>
                      {results.sales.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => navigate(`/dashboard/sales`)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 text-left transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                            <ShoppingCart className="h-4 w-4 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium font-mono">{s.invoiceNumber}</p>
                            <p className="text-xs text-muted-foreground">{s.customer?.name ?? "Walk-in"} · {formatDate(s.createdAt)}</p>
                          </div>
                          <span className="text-sm font-semibold">{formatCurrency(Number(s.totalAmount))}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Customers */}
                  {results.customers.length > 0 && (
                    <div>
                      <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mt-1">
                        <Users className="h-3 w-3" /> Customers ({results.customers.length})
                      </div>
                      {results.customers.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => navigate(`/dashboard/customers`)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 text-left transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0 text-purple-600 font-bold text-sm">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.email ?? c.phone ?? "No contact"}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer shortcuts */}
            <div className="border-t px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground bg-muted/30">
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border bg-background font-mono text-[10px]">↵</kbd> select</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border bg-background font-mono text-[10px]">Esc</kbd> close</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border bg-background font-mono text-[10px]">⌘K</kbd> toggle</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
