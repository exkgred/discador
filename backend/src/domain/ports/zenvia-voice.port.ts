export const ZENVIA_VOICE_PORT = Symbol('ZENVIA_VOICE_PORT');

export interface PlaceCallInput {
  origin: string;
  destination: string;
  recordAudio: boolean;
  tags?: string;
}

export interface PlaceCallResult {
  chamadaId: string;
  mock: boolean;
}

export interface CallInfo {
  chamadaId: string;
  status: string;
  recordingUrl: string | null;
  durationSeconds: number | null;
  spokenSeconds: number | null;
  billedSeconds: number | null;
  price: number | null;
  disconnectReason: string | null;
}

export interface WebphoneInfo {
  url: string | null;
  mock: boolean;
}

export interface ZenviaVoicePort {
  placeCall(input: PlaceCallInput): Promise<PlaceCallResult>;
  getCall(chamadaId: string): Promise<CallInfo | null>;
  hangup(chamadaId: string): Promise<void>;
  getWebphoneUrl(ramalId: string): Promise<WebphoneInfo>;
}
