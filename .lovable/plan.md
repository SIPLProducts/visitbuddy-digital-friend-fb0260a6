Update the `WHATSAPP_BRIDGE_URL` secret to the new ngrok URL:

`https://fd4e-2401-4900-4aa7-42ab-b4da-cbd7-5c32-6c08.ngrok-free.app`

No code changes needed — the `whatsapp-bridge` edge function reads this secret at runtime, so the new URL takes effect on the next invocation. `WHATSAPP_BRIDGE_API_KEY` stays unchanged.

After approval, I'll trigger the secret update prompt for you to confirm the new value.