export class BridgeClient {
    private static baseUrl = process.env.BRIDGE_URL;
    private static apiKey = process.env.BRIDGE_API_KEY;

    static async query(model: string, action: string, args: any) {
        if (!this.baseUrl || !this.apiKey) {
            throw new Error("Bridge configuration missing (BRIDGE_URL or BRIDGE_API_KEY)");
        }

        const response = await fetch(`${this.baseUrl}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-bridge-key': this.apiKey
            },
            body: JSON.stringify({ model, action, args })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Bridge Error: ${error.error || response.statusText}`);
        }

        const result = await response.json();
        return result.data;
    }
}
