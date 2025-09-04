import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SlotEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: { id: string; name: string; time: string; startHour: number; endHour: number } | null;
  onSave: (slotId: string, updates: { name: string; startHour: number; endHour: number }) => void;
}

export default function SlotEditModal({ open, onOpenChange, slot, onSave }: SlotEditModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    startTime: "",
    endTime: ""
  });

  useEffect(() => {
    if (slot && open) {
      setFormData({
        name: slot.name,
        startTime: String(slot.startHour).padStart(2, '0') + ':00',
        endTime: String(slot.endHour).padStart(2, '0') + ':00'
      });
    }
  }, [slot, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!slot) return;

    const startHour = parseInt(formData.startTime.split(':')[0]);
    const endHour = parseInt(formData.endTime.split(':')[0]);

    onSave(slot.id, {
      name: formData.name,
      startHour,
      endHour
    });

    onOpenChange(false);
  };

  if (!slot) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Edit Shift Slot</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Slot Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Morning Shift"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}