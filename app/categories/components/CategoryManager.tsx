"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Archive, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Category } from "@/db/schema";
import {
  getAllCategoriesAction,
  createCategoryAction,
  updateCategoryAction,
  archiveCategoryAction,
  unarchiveCategoryAction,
  reorderCategoriesAction,
} from "../actions";
import {
  categoryColors,
  categoryIcons,
  type CategoryColor,
  type CategoryIcon,
} from "../schemas";
import { SortableCategory } from "./SortableCategory";
import { ColorPicker } from "./ColorPicker";
import { IconPicker } from "./IconPicker";

interface CategoryManagerProps {
  initialCategories?: Category[];
}

export function CategoryManager({ initialCategories = [] }: CategoryManagerProps) {
  const [categories, setCategories] = React.useState<Category[]>(initialCategories);
  const [showArchived, setShowArchived] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);

  // Form state for add/edit
  const [formName, setFormName] = React.useState("");
  const [formColor, setFormColor] = React.useState<CategoryColor>("emerald");
  const [formIcon, setFormIcon] = React.useState<CategoryIcon>("Sparkles");
  const [formError, setFormError] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter categories based on archived toggle
  const activeCategories = React.useMemo(
    () => categories.filter((c) => !c.isArchived),
    [categories]
  );
  const archivedCategories = React.useMemo(
    () => categories.filter((c) => c.isArchived),
    [categories]
  );
  const displayedCategories = showArchived ? categories : activeCategories;

  // Load categories on mount
  React.useEffect(() => {
    async function loadCategories() {
      setIsLoading(true);
      const result = await getAllCategoriesAction();
      if (result.success && result.categories) {
        setCategories(result.categories);
      }
      setIsLoading(false);
    }
    if (initialCategories.length === 0) {
      loadCategories();
    }
  }, [initialCategories.length]);

  // Handle drag end for reordering
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Only reorder within active categories
    const oldIndex = activeCategories.findIndex((c) => c.id === active.id);
    const newIndex = activeCategories.findIndex((c) => c.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistic update
    const reorderedActive = arrayMove(activeCategories, oldIndex, newIndex);
    const newCategories = [
      ...reorderedActive,
      ...archivedCategories,
    ];
    setCategories(newCategories);

    // Prepare reorder data
    const reorders = reorderedActive.map((cat, index) => ({
      id: cat.id,
      displayOrder: index + 1,
    }));

    // Persist to server
    const result = await reorderCategoriesAction(reorders);
    if (!result.success) {
      toast.error("שגיאה בשינוי הסדר");
      // Revert on error
      const reloadResult = await getAllCategoriesAction();
      if (reloadResult.success && reloadResult.categories) {
        setCategories(reloadResult.categories);
      }
    }
  };

  // Open add dialog
  const handleAdd = () => {
    setFormName("");
    setFormColor("emerald");
    setFormIcon("Sparkles");
    setFormError("");
    setIsAddDialogOpen(true);
  };

  // Open edit dialog
  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormName(category.name);
    setFormColor((category.color as CategoryColor) || "emerald");
    setFormIcon((category.icon as CategoryIcon) || "Sparkles");
    setFormError("");
  };

  // Handle form submit (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formName.trim()) {
      setFormError("שם הקטגוריה נדרש");
      return;
    }

    setIsSaving(true);

    if (editingCategory) {
      // Update existing
      const result = await updateCategoryAction({
        id: editingCategory.id,
        name: formName.trim(),
        color: formColor,
        icon: formIcon,
      });

      if (result.success && result.category) {
        setCategories((prev) =>
          prev.map((c) => (c.id === editingCategory.id ? result.category! : c))
        );
        setEditingCategory(null);
        toast.success("הקטגוריה עודכנה");
      } else {
        setFormError(result.error || "שגיאה בעדכון הקטגוריה");
      }
    } else {
      // Create new
      const result = await createCategoryAction({
        name: formName.trim(),
        color: formColor,
        icon: formIcon,
      });

      if (result.success && result.category) {
        setCategories((prev) => [...prev, result.category!]);
        setIsAddDialogOpen(false);
        toast.success("הקטגוריה נוצרה");
      } else {
        setFormError(result.error || "שגיאה ביצירת הקטגוריה");
      }
    }

    setIsSaving(false);
  };

  // Handle archive
  const handleArchive = async (id: string) => {
    const result = await archiveCategoryAction(id);
    if (result.success && result.category) {
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? result.category! : c))
      );
      toast.success("הקטגוריה הועברה לארכיון");
    } else {
      toast.error("שגיאה בהעברה לארכיון");
    }
  };

  // Handle unarchive
  const handleUnarchive = async (id: string) => {
    const result = await unarchiveCategoryAction(id);
    if (result.success && result.category) {
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? result.category! : c))
      );
      toast.success("הקטגוריה שוחזרה");
    } else {
      toast.error("שגיאה בשחזור הקטגוריה");
    }
  };

  // Close dialogs
  const handleCloseEditDialog = () => {
    setEditingCategory(null);
    setFormError("");
  };

  const handleCloseAddDialog = () => {
    setIsAddDialogOpen(false);
    setFormError("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            קטגוריות
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            התאם את הקטגוריות לצרכיך. גרור לשינוי סדר.
          </p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          קטגוריה חדשה
        </Button>
      </div>

      {/* Category List with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={activeCategories.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {activeCategories.map((category) => (
              <SortableCategory
                key={category.id}
                category={category}
                onEdit={handleEdit}
                onArchive={handleArchive}
                onUnarchive={handleUnarchive}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Empty state */}
      {activeCategories.length === 0 && (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <p>אין קטגוריות פעילות.</p>
          <Button variant="link" onClick={handleAdd}>
            צור קטגוריה חדשה
          </Button>
        </div>
      )}

      {/* Archived Section */}
      {archivedCategories.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <Archive className="h-4 w-4" />
            <span>
              {showArchived ? "הסתר ארכיון" : `הצג ארכיון (${archivedCategories.length})`}
            </span>
          </button>

          {showArchived && (
            <div className="mt-4 space-y-2">
              {archivedCategories.map((category) => (
                <SortableCategory
                  key={category.id}
                  category={category}
                  onEdit={handleEdit}
                  onArchive={handleArchive}
                  onUnarchive={handleUnarchive}
                  disabled
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={handleCloseAddDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>קטגוריה חדשה</DialogTitle>
            <DialogDescription>
              הוסף קטגוריה חדשה למעקב אחר ההכנסות שלך.
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            name={formName}
            onNameChange={setFormName}
            color={formColor}
            onColorChange={setFormColor}
            icon={formIcon}
            onIconChange={setFormIcon}
            error={formError}
            isSaving={isSaving}
            onSubmit={handleSubmit}
            onCancel={handleCloseAddDialog}
            submitLabel="צור קטגוריה"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={handleCloseEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>עריכת קטגוריה</DialogTitle>
            <DialogDescription>
              עדכן את פרטי הקטגוריה.
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            name={formName}
            onNameChange={setFormName}
            color={formColor}
            onColorChange={setFormColor}
            icon={formIcon}
            onIconChange={setFormIcon}
            error={formError}
            isSaving={isSaving}
            onSubmit={handleSubmit}
            onCancel={handleCloseEditDialog}
            submitLabel="שמור שינויים"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Form component for add/edit
interface CategoryFormProps {
  name: string;
  onNameChange: (name: string) => void;
  color: CategoryColor;
  onColorChange: (color: CategoryColor) => void;
  icon: CategoryIcon;
  onIconChange: (icon: CategoryIcon) => void;
  error: string;
  isSaving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
}

function CategoryForm({
  name,
  onNameChange,
  color,
  onColorChange,
  icon,
  onIconChange,
  error,
  isSaving,
  onSubmit,
  onCancel,
  submitLabel,
}: CategoryFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6 mt-4">
      {/* Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          שם
        </label>
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="לדוגמה: הופעות"
          className="text-right"
          autoFocus
        />
      </div>

      {/* Color */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          צבע
        </label>
        <ColorPicker value={color} onChange={onColorChange} />
      </div>

      {/* Icon */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          אייקון
        </label>
        <IconPicker value={icon} onChange={onIconChange} color={color} />
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-start gap-3 pt-2">
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          ביטול
        </Button>
      </div>
    </form>
  );
}
