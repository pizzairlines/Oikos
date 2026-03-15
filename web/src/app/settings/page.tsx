"use client";

import { Bell, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { ARRONDISSEMENTS } from "@/lib/types";
import { useAlerts } from "@/hooks/use-alerts";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const {
    alerts, loading, editing,
    startCreate, startEdit, cancelEdit, setEditing,
    save, remove, toggleActive,
  } = useAlerts();
  const { toast } = useToast();

  const handleSave = async () => {
    await save();
    toast(editing?.id ? "Alerte modifiee" : "Alerte creee");
  };

  const handleRemove = async (id: string) => {
    await remove(id);
    toast("Alerte supprimee");
  };

  const handleToggle = async (alert: Parameters<typeof toggleActive>[0]) => {
    await toggleActive(alert);
    toast(alert.is_active ? "Alerte desactivee" : "Alerte activee");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-lg font-semibold text-foreground">Alertes</h1>
        </div>
        <Button size="sm" className="rounded-xl" onClick={startCreate}>
          <Plus className="h-3.5 w-3.5" />
          Nouvelle alerte
        </Button>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="glass-strong rounded-2xl mb-4 animate-fade-in-up">
          <div className="px-5 pt-5 pb-2">
            <h3 className="text-sm font-semibold">
              {editing.id ? "Modifier l'alerte" : "Nouvelle alerte"}
            </h3>
          </div>
          <div className="px-5 pb-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nom</label>
              <Input
                type="text"
                value={editing.name || ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Ex: Opportunites Paris 10-11e"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <InputField label="Prix/m² max" value={editing.max_price_per_sqm} onChange={(v) => setEditing({ ...editing, max_price_per_sqm: v })} placeholder="7500" />
              <InputField label="Score min" value={editing.min_score} onChange={(v) => setEditing({ ...editing, min_score: v })} placeholder="40" />
              <InputField label="Surface min (m²)" value={editing.min_surface} onChange={(v) => setEditing({ ...editing, min_surface: v })} placeholder="20" />
              <InputField label="Budget max" value={editing.max_price} onChange={(v) => setEditing({ ...editing, max_price: v })} placeholder="500000" />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Numero WhatsApp</label>
              <Input
                type="tel"
                value={editing.phone_number || ""}
                onChange={(e) => setEditing({ ...editing, phone_number: e.target.value })}
                placeholder="+33612345678"
                className="h-11 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">Arrondissements</label>
              <div className="flex flex-wrap gap-2">
                {ARRONDISSEMENTS.map((arr) => {
                  const selected = (editing.arrondissements || []).includes(arr.value);
                  return (
                    <button
                      key={arr.value}
                      className={cn(
                        "h-9 min-w-9 px-3 rounded-full text-sm font-medium transition-all duration-150",
                        selected
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                      onClick={() => {
                        const current = editing.arrondissements || [];
                        const updated = selected
                          ? current.filter((a: string) => a !== arr.value)
                          : [...current, arr.value];
                        setEditing({ ...editing, arrondissements: updated });
                      }}
                    >
                      {arr.label.replace("Paris ", "")}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button size="sm" className="rounded-xl" onClick={handleSave}>
                <Check className="h-3.5 w-3.5" />
                Enregistrer
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl" onClick={cancelEdit}>
                <X className="h-3.5 w-3.5" />
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Alert list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl">
              <div className="py-4 px-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <div className="flex gap-1">
                    <Skeleton className="h-6 w-10 rounded-full" />
                    <Skeleton className="h-6 w-6 rounded" />
                    <Skeleton className="h-6 w-6 rounded" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : alerts.length === 0 && !editing ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            <Bell className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground mb-1">Aucune alerte configuree</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Creez une alerte pour recevoir des notifications WhatsApp quand une annonce correspond a vos criteres.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn("glass rounded-2xl transition-opacity", !alert.is_active && "opacity-50")}
            >
              <div className="py-4 px-5">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground">{alert.name}</h3>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                      {alert.max_price_per_sqm && <span>&le; {alert.max_price_per_sqm} €/m²</span>}
                      {alert.min_score && <span>Score &ge; {alert.min_score}</span>}
                      {alert.min_surface && <span>&ge; {alert.min_surface} m²</span>}
                      {alert.max_price && (
                        <span>&le; {new Intl.NumberFormat("fr-FR").format(alert.max_price)} €</span>
                      )}
                    </div>
                    {alert.arrondissements && alert.arrondissements.length > 0 && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Arr. {alert.arrondissements.map((a) => a.slice(3)).join(", ")}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <Switch
                      checked={alert.is_active}
                      onCheckedChange={() => handleToggle(alert)}
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => startEdit(alert)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemove(alert.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InputField({
  label, value, onChange, placeholder,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        placeholder={placeholder}
        className="h-11 rounded-xl"
      />
    </div>
  );
}
