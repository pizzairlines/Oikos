"use client";

import { Bell, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { ARRONDISSEMENTS } from "@/lib/types";
import { useAlerts } from "@/hooks/use-alerts";
import { useToast } from "@/components/Toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        <Button size="sm" onClick={startCreate}>
          <Plus className="h-3.5 w-3.5" />
          Nouvelle alerte
        </Button>
      </div>

      {/* Edit form */}
      {editing && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-sm">
              {editing.id ? "Modifier l'alerte" : "Nouvelle alerte"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nom</label>
              <Input
                type="text"
                value={editing.name || ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Ex: Opportunites Paris 10-11e"
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
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">Arrondissements</label>
              <div className="flex flex-wrap gap-1.5">
                {ARRONDISSEMENTS.map((arr) => {
                  const selected = (editing.arrondissements || []).includes(arr.value);
                  return (
                    <Button
                      key={arr.value}
                      variant={selected ? "default" : "outline"}
                      size="xs"
                      onClick={() => {
                        const current = editing.arrondissements || [];
                        const updated = selected
                          ? current.filter((a: string) => a !== arr.value)
                          : [...current, arr.value];
                        setEditing({ ...editing, arrondissements: updated });
                      }}
                    >
                      {arr.label.replace("Paris ", "")}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleSave}>
                <Check className="h-3.5 w-3.5" />
                Enregistrer
              </Button>
              <Button variant="outline" size="sm" onClick={cancelEdit}>
                <X className="h-3.5 w-3.5" />
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alert list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-4">
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
              </CardContent>
            </Card>
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
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Card
              key={alert.id}
              className={cn("transition-opacity", !alert.is_active && "opacity-50")}
            >
              <CardContent className="py-4">
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
              </CardContent>
            </Card>
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
      />
    </div>
  );
}
