import { useState } from "react";
import { Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { markAbsences } from "../data";

type MarkAbsencesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
};

export function MarkAbsencesDialog({
  open,
  onOpenChange,
  onComplete,
}: MarkAbsencesDialogProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddEmail = (email: string) => {
    const trimmedEmail = email.trim();
    if (trimmedEmail && !emails.includes(trimmedEmail)) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(trimmedEmail)) {
        setEmails([...emails, trimmedEmail]);
        setEmailInput("");
      } else {
        alert("Por favor, ingresa un email válido");
      }
    }
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setEmails(emails.filter((email) => email !== emailToRemove));
  };

  const handleEmailInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddEmail(emailInput);
    } else if (e.key === "," && emailInput.trim()) {
      e.preventDefault();
      handleAddEmail(emailInput);
    } else if (e.key === "Backspace" && !emailInput && emails.length > 0) {
      setEmails(emails.slice(0, -1));
    }
  };

  const handleEmailInputBlur = () => {
    if (emailInput.trim()) {
      handleAddEmail(emailInput);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emails.length === 0 || !date) {
      alert("Por favor, completa los campos requeridos (emails y fecha)");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await markAbsences({
        user_ids: emails,
        date,
        notes: notes || undefined,
      });
      const count = result?.data?.marked_count || 0;
      alert(`Se marcaron ${count} usuario(s) como ausente(s)`);
      setEmails([]);
      setEmailInput("");
      setDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Error marking absences:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Error al marcar ausencias. Por favor, intenta de nuevo.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar ausencias</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="emails">Emails de empleados *</Label>
              {emails.length > 0 && (
                <div className="border rounded-md p-3 bg-gray-50/50 max-h-[150px] overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {emails.map((email, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        <span>{email}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEmail(email)}
                          className="ml-1 hover:bg-gray-300 rounded-full p-0.5 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <Input
                id="emails"
                type="email"
                placeholder={
                  emails.length === 0
                    ? "Escribe un email y presiona Enter o coma"
                    : "Agregar más emails..."
                }
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={handleEmailInputKeyDown}
                onBlur={handleEmailInputBlur}
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                Presiona Enter o coma para agregar cada email. Click en la X
                para remover.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Fecha *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Input
                id="notes"
                type="text"
                placeholder="Motivo de la ausencia..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Marcando..." : "Marcar ausencias"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
