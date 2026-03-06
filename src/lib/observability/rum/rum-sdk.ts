export interface RumEvent {
    sessionId: string;
    userId?: string;
    page: string;
    metric: string;
    value: number;
    userAgent: string;
}

class RumSDK {
    private static instance: RumSDK;
    private buffer: RumEvent[] = [];
    private sessionId: string = '';
    private flushInterval: number = 10000; // 10 seconds
    private timer: NodeJS.Timeout | null = null;

    private constructor() {
        if (typeof window !== 'undefined') {
            this.sessionId = this.getOrCreateSessionId();
            this.startTimer();
        }
    }

    public static getInstance(): RumSDK {
        if (!RumSDK.instance) {
            RumSDK.instance = new RumSDK();
        }
        return RumSDK.instance;
    }

    private getOrCreateSessionId(): string {
        let id = localStorage.getItem('rum_session_id');
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem('rum_session_id', id);
        }
        return id;
    }

    private startTimer() {
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => this.flush(), this.flushInterval);
    }

    public track(metric: string, value: number, userId?: string) {
        if (typeof window === 'undefined') return;

        const event: RumEvent = {
            sessionId: this.sessionId,
            userId,
            page: window.location.pathname,
            metric,
            value,
            userAgent: navigator.userAgent,
        };

        this.buffer.push(event);

        // Guard against massive buffer
        if (this.buffer.length >= 50) {
            this.flush();
        }
    }

    public async flush() {
        if (this.buffer.length === 0) return;

        const events = [...this.buffer];
        this.buffer = [];

        try {
            const response = await fetch('/api/rum/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ events }),
                // Use keepalive to ensure delivery even if page is closed
                keepalive: true,
            });

            if (!response.ok) {
                console.error('RUM: Failed to flush events', await response.text());
                // Simple retry: put them back at the front (could be smarter)
                this.buffer = [...events, ...this.buffer];
            }
        } catch (error) {
            console.error('RUM: Error flushing events', error);
            this.buffer = [...events, ...this.buffer];
        }
    }
}

export const rum = RumSDK.getInstance();
