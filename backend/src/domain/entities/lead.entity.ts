export interface Lead {
  id: string;
  name: string;
  phone: string;
  tags: string[];
  dncBlocked: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
