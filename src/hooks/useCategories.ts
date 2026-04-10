import { useState, useCallback } from 'react';
import { Category, CategoryType } from '@/lib/types';
import { DEFAULT_CATEGORIES } from '@/lib/default-categories';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(false);

  const fetchCategories = useCallback(async (spreadsheetId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/sheets/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId,
          sheetName: 'categories',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      const data = await response.json();

      // Parse categories from sheet format
      // Expected format: [type, group, subgroup, active]
      const parsedCategories: Category[] = (data.values || [])
        .slice(1) // Skip header
        .map((row: any[]) => ({
          type: (row[0] || 'cobros').toLowerCase() as CategoryType,
          group: row[1] || '',
          subgroup: row[2] || '',
          active: row[3] !== 'false' && row[3] !== false,
        }))
        .filter((cat: Category) => cat.group && cat.subgroup);

      if (parsedCategories.length > 0) {
        setCategories(parsedCategories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Keep default categories on error
      setCategories(DEFAULT_CATEGORIES);
    } finally {
      setLoading(false);
    }
  }, []);

  const getGroups = useCallback((type: CategoryType): string[] => {
    const groups = new Set(
      categories
        .filter((cat) => cat.type === type && cat.active)
        .map((cat) => cat.group)
    );
    return Array.from(groups).sort();
  }, [categories]);

  const getSubgroups = useCallback(
    (type: CategoryType, group: string): string[] => {
      const subgroups = new Set(
        categories
          .filter((cat) => cat.type === type && cat.group === group && cat.active)
          .map((cat) => cat.subgroup)
      );
      return Array.from(subgroups).sort();
    },
    [categories]
  );

  return {
    categories,
    loading,
    fetchCategories,
    getGroups,
    getSubgroups,
  };
}
