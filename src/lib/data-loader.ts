import { useState, useEffect, useCallback } from 'react';
import type { HubData } from './types';
import { fetchProjectsWithOrchestrations, fetchPipelineOrchestration } from './github';

const DATA_URL = import.meta.env.BASE_URL + 'data/projects.json';

export function useProjectData() {
  const [data, setData] = useState<HubData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(DATA_URL)
      .then((res) => {
        if (!res.ok) throw new Error('No pre-fetched data');
        return res.json();
      })
      .then((json: HubData) => {
        setData(json);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
        refresh();
      });
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const [projects, pipeline] = await Promise.all([
        fetchProjectsWithOrchestrations(),
        fetchPipelineOrchestration(),
      ]);

      if (!pipeline) throw new Error('Could not fetch pipeline data');

      setData({
        pipeline,
        projects,
        fetchedAt: new Date().toISOString(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch data');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return { data, isLoading, isRefreshing, error, refresh };
}
