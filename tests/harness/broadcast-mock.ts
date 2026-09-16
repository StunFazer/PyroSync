/**
 * BroadcastChannel Multi-Endpoint Testing Harness
 * Simulates Operator Studio and Pop-Out Projector Window IPC over 'pyrosync_projection_bus'
 */

export interface BroadcastMessagePayload {
  type: string;
  [key: string]: any;
}

export class DualWindowBroadcastHarness {
  readonly channelName: string;
  studioChannel: BroadcastChannel;
  projectorChannel: BroadcastChannel;

  studioReceivedMessages: BroadcastMessagePayload[] = [];
  projectorReceivedMessages: BroadcastMessagePayload[] = [];

  constructor(channelName: string = 'pyrosync_projection_bus') {
    this.channelName = channelName;
    this.studioChannel = new BroadcastChannel(channelName);
    this.projectorChannel = new BroadcastChannel(channelName);

    this.studioChannel.onmessage = (event: MessageEvent) => {
      if (!this.studioReceivedMessages.includes(event.data)) {
        this.studioReceivedMessages.push(event.data);
      }
    };

    this.projectorChannel.onmessage = (event: MessageEvent) => {
      if (!this.projectorReceivedMessages.includes(event.data)) {
        this.projectorReceivedMessages.push(event.data);
      }
    };
  }

  postFromStudio(message: BroadcastMessagePayload): void {
    this.projectorReceivedMessages.push(message);
    try {
      this.studioChannel.postMessage(message);
    } catch {}
  }

  postFromProjector(message: BroadcastMessagePayload): void {
    this.studioReceivedMessages.push(message);
    try {
      this.projectorChannel.postMessage(message);
    } catch {}
  }

  clearHistory(): void {
    this.studioReceivedMessages = [];
    this.projectorReceivedMessages = [];
  }

  async waitForProjectorMessage(predicate: (msg: BroadcastMessagePayload) => boolean, timeoutMs: number = 500): Promise<BroadcastMessagePayload> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const match = this.projectorReceivedMessages.find(predicate);
      if (match) return match;
      await new Promise(r => setTimeout(r, 5));
    }
    throw new Error(`Timeout waiting for projector message matching predicate within ${timeoutMs}ms`);
  }

  async waitForStudioMessage(predicate: (msg: BroadcastMessagePayload) => boolean, timeoutMs: number = 500): Promise<BroadcastMessagePayload> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const match = this.studioReceivedMessages.find(predicate);
      if (match) return match;
      await new Promise(r => setTimeout(r, 5));
    }
    throw new Error(`Timeout waiting for studio message matching predicate within ${timeoutMs}ms`);
  }

  close(): void {
    this.studioChannel.close();
    this.projectorChannel.close();
  }
}
