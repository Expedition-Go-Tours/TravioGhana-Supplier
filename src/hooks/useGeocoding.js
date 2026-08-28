import { useState, useRef, useCallback, useEffect } from "react";
import config from "@/config";

const cache = new Map();
const MAX_CACHE_SIZE = 50;

function getCached(query) {
  const key = query.trim().toLowerCase();
  if (cache.has(key)) {
    const entry = cache.get(key);
    cache.delete(key);
    cache.set(key, entry);
    return entry;
  }
  return null;
}

function setCached(query, data) {
  const key = query.trim().toLowerCase();
  if (cache.has(key)) {
    cache.delete(key);
  } else if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  cache.set(key, data);
}

const apiBase = config.api.baseURL;

export function useGeocoding(minQueryLength = 2) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [debouncing, setDebouncing] = useState(false);
  const [error, setError] = useState(null);

  const abortRef = useRef(null);
  const timerRef = useRef(null);
  const lastQueryRef = useRef("");
  const minLenRef = useRef(minQueryLength);

  useEffect(() => {
    minLenRef.current = minQueryLength;
  }, [minQueryLength]);

  const executeSearch = useCallback(async (query) => {
    const controller = new AbortController();
    abortRef.current = controller;

    setDebouncing(false);
    setLoading(true);

    try {
      const res = await fetch(
        `${apiBase}/locations/autocomplete?q=${encodeURIComponent(query)}&limit=5`,
        { signal: controller.signal }
      );
      if (!res.ok) throw new Error(`Location API HTTP ${res.status}`);
      const body = await res.json();
      const data = body?.data?.results || [];
      setCached(query, data);
      setResults(data);
      setError(null);
    } catch (err) {
      if (err.name !== "AbortError") {
        const message = err.message || "Failed to fetch location suggestions";
        setError(message);
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const search = useCallback((query) => {
    if (abortRef.current) abortRef.current.abort();
    if (timerRef.current) clearTimeout(timerRef.current);

    const trimmed = query.trim();
    lastQueryRef.current = trimmed;

    if (!trimmed || trimmed.length < minLenRef.current) {
      setResults([]);
      setLoading(false);
      setDebouncing(false);
      setError(null);
      return;
    }

    const cached = getCached(trimmed);
    if (cached) {
      setResults(cached);
      setLoading(false);
      setDebouncing(false);
      setError(null);
      return;
    }

    setDebouncing(true);
    setError(null);

    timerRef.current = setTimeout(() => {
      executeSearch(trimmed);
    }, 400);
  }, [executeSearch]);

  const retry = useCallback(() => {
    const query = lastQueryRef.current;
    if (!query) return;
    setLoading(true);
    setError(null);
    setDebouncing(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    executeSearch(query);
  }, [executeSearch]);

  const clear = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    if (timerRef.current) clearTimeout(timerRef.current);
    setResults([]);
    setLoading(false);
    setDebouncing(false);
    setError(null);
    lastQueryRef.current = "";
  }, []);

  return { search, retry, clear, results, loading, debouncing, error };
}
