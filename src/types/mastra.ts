/**
 * Types for Mastra client interactions
 */

export interface MastraMessage {
  role: string;
  content: string;
}

export interface MastraStreamOptions {
  memory?: {
    thread: string;
    resource: string;
  };
}

export interface MastraStreamResponse {
  processDataStream(options: {
    onChunk: (chunk: unknown) => Promise<void>;
  }): Promise<void>;
}

export interface MastraAgent {
  streamVNext(
    messages: MastraMessage[],
    options?: MastraStreamOptions
  ): Promise<MastraStreamResponse>;
}

export interface MastraClient {
  getAgent(agentId: string): MastraAgent;
  getAgents(): Promise<unknown>;
}
