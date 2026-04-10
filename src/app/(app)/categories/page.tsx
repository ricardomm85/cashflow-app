'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { Category } from '@/lib/types';
import { DEFAULT_CATEGORIES } from '@/lib/default-categories';

interface CategoryGroup {
  group: string;
  subgroups: Array<{
    subgroup: string;
    active: boolean;
  }>;
}

interface CategorySection {
  type: 'cobros' | 'pagos' | 'otros';
  label: string;
  groups: Record<string, CategoryGroup>;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<any>(null);

  const typeLabels = {
    cobros: 'Cobros',
    pagos: 'Pagos',
    otros: 'Otros cobros/pagos',
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const settingsResponse = await fetch('/api/user/settings');
        const settingsData = await settingsResponse.json();
        setSettings(settingsData);

        const { spreadsheet_id } = settingsData;
        const response = await fetch(
          `/api/sheets/read?spreadsheetId=${spreadsheet_id}&range=categories!A:D`
        );
        const data = await response.json();

        const loadedCategories: Category[] = (data.data || [])
          .slice(1)
          .map((row: any[]) => ({
            type: row[0] as 'cobros' | 'pagos' | 'otros',
            group: row[1] || '',
            subgroup: row[2] || '',
            active: row[3] !== 'false',
          }));

        setCategories(loadedCategories);
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const groupedCategories = (): CategorySection[] => {
    const sections: Record<string, CategorySection> = {
      cobros: { type: 'cobros', label: typeLabels.cobros, groups: {} },
      pagos: { type: 'pagos', label: typeLabels.pagos, groups: {} },
      otros: { type: 'otros', label: typeLabels.otros, groups: {} },
    };

    categories.forEach((cat) => {
      if (!sections[cat.type].groups[cat.group]) {
        sections[cat.type].groups[cat.group] = {
          group: cat.group,
          subgroups: [],
        };
      }
      sections[cat.type].groups[cat.group].subgroups.push({
        subgroup: cat.subgroup,
        active: cat.active,
      });
    });

    return Object.values(sections);
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const updateCategory = (type: string, group: string, subgroup: string, updates: Partial<Category>) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.type === type && cat.group === group && cat.subgroup === subgroup
          ? { ...cat, ...updates }
          : cat
      )
    );
  };

  const deleteCategory = (type: string, group: string, subgroup: string) => {
    setCategories((prev) =>
      prev.filter(
        (cat) => !(cat.type === type && cat.group === group && cat.subgroup === subgroup)
      )
    );
  };

  const addSubgroup = (type: string, group: string) => {
    setCategories((prev) => [
      ...prev,
      {
        type: type as 'cobros' | 'pagos' | 'otros',
        group,
        subgroup: 'Nuevo subgrupo',
        active: true,
      },
    ]);
  };

  const addGroup = (type: string) => {
    setCategories((prev) => [
      ...prev,
      {
        type: type as 'cobros' | 'pagos' | 'otros',
        group: 'Nuevo grupo',
        subgroup: 'Nueva subcategoría',
        active: true,
      },
    ]);
  };

  const saveChanges = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const rows: string[][] = categories.map((cat) => [
        cat.type,
        cat.group,
        cat.subgroup,
        cat.active ? 'true' : 'false',
      ]);

      const response = await fetch('/api/sheets/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: settings.spreadsheet_id,
          range: 'categories!A2',
          values: rows,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save categories');
      }
    } catch (error) {
      console.error('Error saving categories:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const restoreDefaults = async () => {
    if (!confirm('¿Restaurar categorías por defecto? Se perderán los cambios no guardados.')) {
      return;
    }

    setCategories(DEFAULT_CATEGORIES);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-500">Cargando categorías...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categorías</h1>
          <p className="text-slate-600 mt-1">Gestiona tus categorías de transacciones</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={restoreDefaults}
            className="text-slate-600"
          >
            Restaurar por defecto
          </Button>
          <Button
            onClick={saveChanges}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </div>

      {groupedCategories().map((section) => (
        <Card key={section.type}>
          <CardHeader className="bg-slate-50 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{section.label}</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addGroup(section.type)}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                Añadir grupo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {Object.values(section.groups)
              .sort((a, b) => a.group.localeCompare(b.group))
              .map((groupData) => {
                const groupKey = `${section.type}-${groupData.group}`;
                const isExpanded = expandedGroups.has(groupKey);

                return (
                  <div key={groupKey} className="border rounded-lg">
                    <div className="flex items-center justify-between p-4 bg-slate-50 cursor-pointer hover:bg-slate-100"
                      onClick={() => toggleGroup(groupKey)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-slate-600" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-600" />
                        )}
                        <span className="font-semibold text-slate-900">
                          {groupData.group}
                        </span>
                        <Badge variant="secondary" className="ml-auto mr-4">
                          {groupData.subgroups.length}
                        </Badge>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t bg-white">
                        <div className="space-y-3 p-4">
                          {groupData.subgroups.map((sg) => (
                            <div
                              key={sg.subgroup}
                              className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded"
                            >
                              <div className="flex-1">
                                <Input
                                  value={sg.subgroup}
                                  onChange={(e) => {
                                    updateCategory(
                                      section.type,
                                      groupData.group,
                                      sg.subgroup,
                                      { subgroup: e.target.value }
                                    );
                                  }}
                                  className="border-0 bg-white p-1 px-2"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={sg.active}
                                  onCheckedChange={(checked) => {
                                    updateCategory(
                                      section.type,
                                      groupData.group,
                                      sg.subgroup,
                                      { active: checked }
                                    );
                                  }}
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    deleteCategory(section.type, groupData.group, sg.subgroup);
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addSubgroup(section.type, groupData.group)}
                            className="w-full gap-1 mt-2"
                          >
                            <Plus className="w-4 h-4" />
                            Añadir subgrupo
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
