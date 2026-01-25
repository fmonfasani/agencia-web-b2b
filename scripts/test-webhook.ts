/**
 * Mock Webhook Test
 * This script simulates a Meta Webhook POST request to verify the bot's logic.
 */
async function runMockTest() {
  const url = "http://localhost:3000/api/v1/whatsapp";

  const mockPayload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA_ID",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "123456789",
                phone_number_id: "PHONE_ID",
              },
              contacts: [
                { profile: { name: "Test User" }, wa_id: "123456789" },
              ],
              messages: [
                {
                  from: "123456789",
                  id: "wamid.HBgLMTIzNDU2Nzg5FQIAERgSQjU1RjYyOEY1RjVGNUY1RjU1AA==",
                  timestamp: "1671234567",
                  text: {
                    body: "Hola, me gustaría saber más sobre el desarrollo web para mi empresa de logística.",
                  },
                  type: "text",
                },
              ],
            },
            field: "messages",
          },
        ],
      },
    ],
  };

  console.log("--- STARTING MOCK WEBHOOK TEST ---");
  console.log("Sending payload to:", url);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hub-signature-256": "sha256=MOCK_SIGNATURE", // In real testing, we'd bypass or use a real secret
      },
      body: JSON.stringify(mockPayload),
    });

    const data = await response.json();
    console.log("Response Status:", response.status);
    console.log("Response Body:", JSON.stringify(data, null, 2));

    if (response.status === 200) {
      console.log("✅ Success: Webhook processed correctly.");
    } else {
      console.log("❌ Error: Webhook returned status", response.status);
    }
  } catch (error) {
    console.error("❌ Network Error:", error.message);
  }
}

runMockTest();
