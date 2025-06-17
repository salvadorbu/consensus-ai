export interface ConsensusChannel {
  id: string;
  status: string;
  rounds_executed: number | null;
  answer?: string | null;
  created_at: string;
  finished_at?: string | null;
}
