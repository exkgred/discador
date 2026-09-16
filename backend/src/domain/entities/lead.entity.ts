export interface Lead {
  id: string;
  name: string;
  phone: string;
  company?: string;
  city?: string;
  segment?: string;
  activity?: string;
  tags: string[];
  dncBlocked: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
