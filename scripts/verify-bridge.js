async function verify() {
  const url = "https://myspace-perceived-chips-finance.trycloudflare.com/query";
  const key = "karaoke-bridge-key-2026";

  console.log(`Testing Bridge at: ${url}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bridge-key": key,
      },
      body: JSON.stringify({
        model: "user",
        action: "count",
        args: {},
      }),
    });

    const text = await response.text();
    try {
      const data = JSON.parse(text);
      console.log("Response Details:", JSON.stringify(data, null, 2));
      if (response.ok) {
        console.log(
          "✅ CONEXIÓN EXITOSA: El Bridge está funcionando y reportó " +
            (data.data || 0) +
            " usuarios.",
        );
      } else {
        console.log("❌ ERROR DEL BRIDGE: " + (data.error || "Desconocido"));
      }
    } catch (e) {
      console.log("Response status:", response.status);
      console.log("Raw Response:", text);
    }
  } catch (err) {
    console.error("❌ ERROR FATAL:", err.message);
  }
}

verify();
